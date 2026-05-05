import { pool } from "../../utils/db.js";
import { loadAssistantContext } from "../assistant/assistant.service.js";
import { saveDietPlan } from "../diets/diets.service.js";
import { saveWorkoutPlan } from "../workouts/workouts.service.js";

const defaultModel       = process.env.OPENAI_MODEL         || "gpt-4o-mini";
// Para geração de treino/dieta usa um modelo dedicado (pode ser diferente do chat)
// gpt-4o-mini já é bom, mas se quiser mais qualidade troque por gpt-4.1-mini ou gpt-4o
const structuredModel    = process.env.OPENAI_STRUCTURED_MODEL || defaultModel;
const openAiUrl = "https://api.openai.com/v1/chat/completions";

export async function ensureLocalAiTables() {
  await pool.query(`
    create table if not exists ai_generation_runs (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      generation_type varchar(40) not null,
      model varchar(120),
      status varchar(30) not null default 'pending',
      instructions text,
      input_messages jsonb not null default '[]'::jsonb,
      input_context jsonb not null default '{}'::jsonb,
      response_text text,
      response_json jsonb,
      error_message text,
      tokens_input integer,
      tokens_output integer,
      tokens_total integer,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (generation_type in ('chat', 'diet', 'workout', 'recommendation')),
      check (status in ('pending', 'completed', 'failed'))
    );

    create table if not exists ai_data_writes (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      ai_generation_run_id bigint references ai_generation_runs(id) on delete set null,
      target_table varchar(80) not null,
      target_id bigint,
      action varchar(30) not null,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      check (action in ('insert', 'update', 'archive', 'delete', 'noop'))
    );

    create index if not exists idx_ai_generation_runs_account_date
      on ai_generation_runs (account_id, created_at desc);

    create index if not exists idx_ai_generation_runs_account_type
      on ai_generation_runs (account_id, generation_type, created_at desc);

    create index if not exists idx_ai_data_writes_account_date
      on ai_data_writes (account_id, created_at desc);
  `);

  await pool.query(`
    with ranked_training as (
      select
        id,
        row_number() over (partition by account_id order by updated_at desc, id desc) as rn
      from training_plans
      where plan_status = 'active'
    )
    update training_plans tp
    set plan_status = 'archived',
        updated_at = current_timestamp
    from ranked_training rt
    where tp.id = rt.id
      and rt.rn > 1;

    create unique index if not exists idx_training_plans_one_active
      on training_plans (account_id)
      where plan_status = 'active';

    with ranked_diets as (
      select
        id,
        row_number() over (partition by account_id order by updated_at desc, id desc) as rn
      from diet_plans
      where plan_status = 'active'
    )
    update diet_plans dp
    set plan_status = 'archived',
        updated_at = current_timestamp
    from ranked_diets rd
    where dp.id = rd.id
      and rd.rn > 1;

    create unique index if not exists idx_diet_plans_one_active
      on diet_plans (account_id)
      where plan_status = 'active';
  `);
}

function requireOpenAiKey() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY nao configurada no backend/.env.");
    error.status = 500;
    throw error;
  }
}

function getUsage(response) {
  const usage = response?.usage || {};

  return {
    input: usage.input_tokens ?? usage.prompt_tokens ?? null,
    output: usage.output_tokens ?? usage.completion_tokens ?? null,
    total: usage.total_tokens ?? null,
  };
}

function toPublicRun(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    generationType: row.generation_type,
    model: row.model,
    status: row.status,
    tokens: {
      input: row.tokens_input,
      output: row.tokens_output,
      total: row.tokens_total,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function compactContext(context) {
  return {
    scope: context.scope,
    account: context.account,
    profile: context.profile,
    health: context.health,
    nutrition: context.nutrition,
    progress: context.progress,
    checkins: context.checkins,
    workout: context.workout,
    diet: context.diet,
    preferences: context.preferences,
    settings: context.settings,
  };
}

function extractJson(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const match = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/({[\s\S]*})/);

    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[1]);
    } catch (parseError) {
      return null;
    }
  }
}

async function createRun({ accountId, generationType, model, instructions, inputMessages, inputContext }) {
  const result = await pool.query(
    `
      insert into ai_generation_runs (
        account_id,
        generation_type,
        model,
        status,
        instructions,
        input_messages,
        input_context
      )
      values ($1, $2, $3, 'pending', $4, $5::jsonb, $6::jsonb)
      returning *;
    `,
    [
      accountId,
      generationType,
      model,
      instructions,
      JSON.stringify(inputMessages || []),
      JSON.stringify(inputContext || {}),
    ]
  );

  return result.rows[0];
}

async function completeRun(runId, { text, usage, responseJson = null }) {
  const result = await pool.query(
    `
      update ai_generation_runs
      set status = 'completed',
          response_text = $2,
          response_json = $3::jsonb,
          tokens_input = $4,
          tokens_output = $5,
          tokens_total = $6,
          updated_at = now()
      where id = $1
      returning *;
    `,
    [
      runId,
      text || "",
      responseJson ? JSON.stringify(responseJson) : null,
      usage.input,
      usage.output,
      usage.total,
    ]
  );

  return result.rows[0];
}

async function failRun(runId, error) {
  await pool.query(
    `
      update ai_generation_runs
      set status = 'failed',
          error_message = $2,
          updated_at = now()
      where id = $1;
    `,
    [runId, error.message || "Falha ao chamar OpenAI."]
  );
}

/**
 * Monta o prompt de sistema com instruções + contexto completo do usuário.
 * O contexto é inserido no system message — nunca exposto no user message —
 * garantindo que o modelo só enxerga dados do accountId autenticado.
 */
function buildSystemMessage(instructions, context, accountId, personalNameOverride = null) {
  const personalName = personalNameOverride || context?.settings?.personal_name || "Personal Virtual";

  const scopeRules = [
    `IDENTIDADE: Seu nome é ${personalName}. Você é o Personal Virtual do Shape Certo.`,
    `REGRA OBRIGATÓRIA: Sempre que se apresentar ou for perguntado seu nome, use EXATAMENTE: "${personalName}". Nunca se apresente como "Personal Virtual" sem incluir o nome ${personalName}.`,
    `Responda SOMENTE com base nos dados do usuário autenticado (account_id: ${accountId}).`,
    `Nunca invente dados clínicos. Nunca prescreva condutas médicas.`,
    `Se faltar informação, sinalize claramente.`,
    `Responda sempre em Português do Brasil.`,
    `Tópicos bloqueados: dados de outros usuários, senhas, tokens secretos, cartão de crédito completo.`,
    `\nInstruções específicas: ${instructions}`,
  ].join("\n");

  return `${scopeRules}\n\n--- DADOS DO USUÁRIO AUTENTICADO ---\n${JSON.stringify(context)}`;
}

/**
 * Chama a OpenAI Chat Completions API (gpt-4o-mini).
 *
 * @param {object} opts
 * @param {string}   opts.accountId       - ID do usuário autenticado (isolamento de dados)
 * @param {string}   opts.generationType  - 'chat' | 'diet' | 'workout' | 'recommendation'
 * @param {string}   opts.instructions    - prompt de sistema específico para o tipo
 * @param {string}   opts.input           - mensagem atual do usuário
 * @param {Array}    [opts.history]        - histórico de conversa [{role, text}]
 * @param {boolean}  [opts.expectJson]    - true para dieta/treino (extrai JSON da resposta)
 */
async function callOpenAi({ accountId, generationType, instructions, input, history = [], expectJson = false, personalNameOverride = null, modelOverride = null, maxTokensOverride = null }) {
  requireOpenAiKey();

  const context = compactContext(await loadAssistantContext(accountId));
  const model = modelOverride || (expectJson ? structuredModel : defaultModel);

  // Monta array de mensagens no formato Chat Completions
  const systemContent = buildSystemMessage(instructions, context, accountId, personalNameOverride);

  // Limita histórico a 20 mensagens (10 trocas) para não explodir o contexto
  const recentHistory = history.slice(-20);

  const messages = [
    { role: "system", content: systemContent },
    // Histórico de conversa anterior (já no formato OpenAI)
    ...recentHistory.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: String(m.text || m.content || ""),
    })),
    // Mensagem atual do usuário
    { role: "user", content: String(input).trim() },
  ];

  // Persiste o run como 'pending' antes de chamar a API
  const run = await createRun({
    accountId,
    generationType,
    model,
    instructions,
    inputMessages: messages,
    inputContext: context,
  });

  try {
    const response = await fetch(openAiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokensOverride ?? (expectJson ? 12000 : 2048),
        // Para geração de JSON estruturado (dieta/treino), força JSON mode
        ...(expectJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.error?.message || "Falha ao chamar OpenAI.");
      error.status = response.status;
      throw error;
    }

    // Chat Completions retorna: choices[0].message.content
    const text = data.choices?.[0]?.message?.content || "";
    const usage = getUsage(data);
    const responseJson = expectJson ? extractJson(text) : null;

    const completedRun = await completeRun(run.id, { text, usage, responseJson });

    return {
      run: completedRun,
      publicRun: toPublicRun(completedRun),
      text,
      json: responseJson,
    };
  } catch (error) {
    await failRun(run.id, error);
    throw error;
  }
}

export async function generateAiChatResponse(accountId, { message, history = [], personalName = null }) {
  if (!String(message || "").trim()) {
    const error = new Error("Informe uma mensagem para o Personal Virtual.");
    error.status = 400;
    throw error;
  }

  const result = await callOpenAi({
    accountId,
    generationType: "chat",
    instructions:
      "Você é o Personal Virtual do Shape Certo. Analise o contexto do usuário e responda de forma precisa, prática e motivadora. Use os dados reais disponíveis. Quando não houver dados suficientes, sinalize e sugira como preencher a lacuna.",
    input: String(message).trim(),
    history,
    personalNameOverride: personalName,
  });

  return {
    run: result.publicRun,
    text: result.text,
  };
}

export async function generateAiDietPlan(accountId, { goal, persist = false } = {}) {
  const instructions = `
Gere um plano alimentar personalizado em JSON valido para o Shape Certo.

REGRAS OBRIGATORIAS (leia o contexto do usuario antes de gerar):
1. RESTRICOES E ALERGIAS: leia "nutrition.allergies_notes" e "nutrition.restrictions_notes". NUNCA inclua alimentos proibidos ou alegenicos.
2. PREFERENCIAS: leia "nutrition.preferred_foods" (incluir prioritariamente) e "nutrition.disliked_foods" (evitar ao maximo). Leia tambem "preferences.foods" (mark: "like" = incluir, "dislike" = evitar).
3. REFEICOES: leia "nutrition.meals_per_day" para definir quantas refeicoes habilitar. Se nao informado, use 4-5 refeicoes.
4. OBJETIVO E MACROS: use o objetivo informado na requisicao para definir o perfil de macronutrientes:
   - hipertrofia: superavit calorico (~300-500 kcal acima do TDEE), proteina alta (2-2.5g/kg)
   - emagrecimento/cutting: deficit calorico (~300-500 kcal abaixo do TDEE), proteina alta para preservar massa
   - recomposicao: manutencao calorica, proteina moderada-alta
   - condicionamento/saude: manutencao calorica, dieta equilibrada
5. SINAIS DO CHECK-IN: leia o check-in mais recente (context.checkins[0]):
   - "hunger" alto: aumente volume de alimentos ou fibras
   - "dietAdherence" baixo: simplifique refeicoes, use alimentos mais praticos
6. MEDIDAS: use "progress.measurements[0].weight_kg" e "progress.bioimpedance[0]" para calcular necessidade calorica. Se nao houver, use "profile.current_weight_kg" e "profile.activity_level".
7. DIAS DA SEMANA: gere dayPlans para todos os 7 dias com variacao entre os dias.
8. VALORES NUTRICIONAIS: preencha calories, protein, carbs, fats para cada refeicao com valores numericos reais (strings, ex: "450", "35").
9. QUANTIDADES OBRIGATORIAS: no campo "foods", especifique a quantidade exata de cada alimento. Use gramas (g), mililitros (ml) ou unidades conforme adequado. Exemplo: "3 ovos inteiros, 40g aveia em flocos, 1 banana media (120g), 200ml cafe preto sem acucar". Nunca liste apenas o nome do alimento sem a quantidade.
10. SUBSTITUICOES OBRIGATORIAS: no campo "notes", liste 2-3 opcoes de substituicao para os principais alimentos da refeicao, respeitando restricoes e preferencias. Formato: "Substituicoes: trocar X por Y; trocar A por B". Exemplo: "Substituicoes: trocar aveia por 40g tapioca ou 2 fatias de pao integral; trocar banana por 1 maca ou 150g mamao".

SLOTS DISPONIVEIS (use os IDs exatos): desjejum, cafe-manha, brunch, almoco, cafe-tarde, pre-treino, pos-treino, janta, ceia
DIAS (use os IDs exatos): segunda, terca, quarta, quinta, sexta, sabado, domingo

ESTRUTURA JSON OBRIGATORIA:
{
  "title": "<nome do plano>",
  "nutritionalGoal": "<descricao do objetivo nutricional>",
  "startDate": "<YYYY-MM-DD>",
  "endDate": "<YYYY-MM-DD, 28 dias apos startDate>",
  "guidance": "<orientacoes gerais em 2-3 frases>",
  "recommendedMeals": <numero inteiro>,
  "userAvailableMeals": <numero inteiro>,
  "restrictionNotes": "<restricoes identificadas>",
  "preferenceNotes": "<preferencias identificadas>",
  "meals": [
    {
      "id": "<slot_id>",
      "name": "<nome da refeicao>",
      "enabled": <true|false>,
      "calories": "<numero>",
      "protein": "<numero>",
      "carbs": "<numero>",
      "fats": "<numero>",
      "foods": "<cada alimento COM quantidade exata, separados por virgula — ex: 3 ovos inteiros, 40g aveia, 1 banana media (120g), 200ml cafe preto>",
      "description": "<descricao curta da refeicao>",
      "notes": "<substituicoes: trocar X por Y; trocar A por B — 2 a 3 opcoes, respeitando restricoes>"
    }
  ],
  "dayPlans": {
    "segunda": { "meals": [ <mesma estrutura de meals acima com variacao> ] },
    "terca":   { "meals": [ ... ] },
    "quarta":  { "meals": [ ... ] },
    "quinta":  { "meals": [ ... ] },
    "sexta":   { "meals": [ ... ] },
    "sabado":  { "meals": [ ... ] },
    "domingo": { "meals": [ ... ] }
  }
}

Nao inclua texto fora do JSON.
`.trim();

  const result = await callOpenAi({
    accountId,
    generationType: "diet",
    expectJson: true,
    instructions,
    input: `Gere um plano alimentar completo e atualizado com base em todos os dados do usuario.${goal ? ` Objetivo principal: ${goal}.` : ""} Consulte as preferencias e restricoes alimentares, o numero de refeicoes, os sinais do ultimo check-in e as medidas corporais para calcular as necessidades calorias e macros.`,
  });

  if (persist && result.json) {
    const protocol = await saveDietPlan(accountId, result.json);
    await pool.query(
      `
        insert into ai_data_writes (account_id, ai_generation_run_id, target_table, target_id, action, payload)
        values ($1, $2, 'diet_plans', $3, 'update', $4::jsonb);
      `,
      [accountId, result.run.id, protocol.id, JSON.stringify(protocol)]
    );
    return {
      run: result.publicRun,
      text: result.text,
      json: result.json,
      protocol,
    };
  }

  return {
    run: result.publicRun,
    text: result.text,
    json: result.json,
  };
}

export async function generateAiWorkoutPlan(accountId, { goal, persist = false, trainingAvailableDays = "", trainingExperience = "", trainingAge = "", availableMinutes = "" } = {}) {
  const instructions = `
Gere um plano de treino personalizado em JSON valido para o Shape Certo.

=== PRIORIDADE ABSOLUTA 1 — DIAS DE TREINO ===
Se "trainingAvailableDays" for fornecido na requisicao (campo nao vazio):
  - Use EXATAMENTE esses dias como "enabled": true no JSON de saida.
  - TODOS os outros dias devem ter "enabled": false e "exercises": [].
  - NAO redistribua, NAO adicione, NAO remova nenhum dia. A selecao do usuario e definitiva.
=== FIM PRIORIDADE 1 ===

=== PRIORIDADE ABSOLUTA 2 — VOLUME POR NIVEL ===
O numero de exercicios por sessao NAO e opcional — e obrigatorio calibrar pelo nivel:

NIVEL INICIANTE (nunca treinou ou menos de 6 meses):
  - 4 a 5 exercicios por dia de treino ativo
  - 3 series por exercicio
  - Compostos + 1-2 isolados por sessao
  - Preferir Full Body ou Upper/Lower

NIVEL INTERMEDIARIO (6 meses a 5 anos de treino):
  - MINIMO 5 exercicios, IDEAL 6 a 7 exercicios por dia de treino ativo
  - 3 a 4 series por exercicio
  - Compostos multiarticulares + exercicios complementares + 2-3 isolados por sessao
  - Splits ABC, ABCD ou Upper/Lower dependendo da frequencia semanal

NIVEL AVANCADO (mais de 5 anos de treino):
  - MINIMO 6 exercicios, IDEAL 7 a 8 exercicios por dia de treino ativo
  - 4 a 5 series nos compostos, 3 a 4 nos isolados
  - Variedade de angulos, tecnicas avancadas (drop-set, rest-pause no aiFeedback)
  - Splits ABCDE, Push/Pull/Legs

ATENCAO: gerar 3 ou 4 exercicios para um intermediario ou avancado e INCORRETO.
Respeite os minimos acima independente de qualquer outro parametro.
=== FIM PRIORIDADE 2 ===

DADOS OBRIGATORIOS A LER NO CONTEXTO:
1. NIVEL DE EXPERIENCIA: use o valor informado explicitamente na requisicao (campo "trainingExperience"). Se vazio, leia "payload.trainingExperience" do checkin mais recente. Se ainda vazio, use "intermediario" como padrao.
2. TEMPO DE TREINAMENTO: use "trainingAge" da requisicao para confirmar nivel. Ex: "2-5-anos" confirma intermediario mesmo que nao declarado.
3. TEMPO DISPONIVEL: use "availableMinutes" da requisicao para ajustar densidade do treino. Se 45min, prefira 5-6 exercicios densos. Se 90min, pode ter 7-8 com mais volume.
4. EQUIPAMENTOS: leia "preferences.gymEquipment" — use SOMENTE os com "available: true". Se vazio, use equipamentos de academia completa (barra, halteres, maquinas de musculacao, cabo).
5. SINAIS DE RECUPERACAO: leia fatigueLevel, sleepQuality, trainingPerformance do checkin mais recente:
   - fatigueLevel >= 4 OU sleepQuality <= 2: reduza 1 serie por exercicio (mas mantenha o numero de exercicios)
   - trainingPerformance <= 2: priorize compostos basicos
6. OBJETIVO: use o objetivo informado na requisicao. Se nao informado, use "goal" do contexto.
7. HISTORICO: leia "workout.recentSessions" para variar exercicios e nao repetir identicamente.

DISTRIBUICAO DOS DIAS DE DESCANSO (so aplique quando trainingAvailableDays NAO for informado):
- 3 dias: SEG/QUA/SEX ou TER/QUI/SAB
- 4 dias: SEG/TER/QUI/SEX
- 5 dias: SEG a SEX
- Nunca concentre todos os descansos no final da semana

VOLUME SEMANAL POR GRUPO MUSCULAR (Krieger 2010):
- Iniciante: 10-12 series/semana
- Intermediario: 14-20 series/semana
- Avancado: 18-25 series/semana

REP RANGES POR OBJETIVO (Schoenfeld 2017):
- Hipertrofia: 6-12 reps, descanso 60-90s
- Forca: 3-6 reps, descanso 120-180s
- Emagrecimento/cutting: 12-15 reps, descanso 30-60s
- Condicionamento/saude: 12-20 reps, descanso 45-60s
- Recomposicao: 8-15 reps variados, descanso 60-90s

ORDEM DOS EXERCICIOS (neurological priority):
1. Compostos pesados (supino, agachamento, terra, puxada, remada, desenvolvimento)
2. Compostos auxiliares ou maquinas pesadas
3. Exercicios isolados (curl, extensao, elevacao lateral, crucifixo)
Nunca coloque biceps no dia anterior a costas.

SPLITS RECOMENDADOS:
- 2 dias: Full Body A/B
- 3 dias: ABC (Peito+Tri / Costas+Bi / Pernas+Ombros)
- 4 dias: Upper A / Lower A / Upper B / Lower B  ou  ABCD
- 5 dias: Push / Pull / Legs / Upper / Lower  ou  ABCDE
- Emagrecimento: prefira Full Body ou Upper/Lower

ESTRUTURA JSON OBRIGATORIA (inclua TODOS os 7 dias da semana):
{
  "weeklyTrainingDays": <numero inteiro de dias ativos>,
  "trainingShift": "morning" | "afternoon" | "evening",
  "split": "<nome do split>",
  "updatedAt": "<ISO timestamp>",
  "workouts": [
    {
      "id": "<monday|tuesday|wednesday|thursday|friday|saturday|sunday>",
      "title": "<nome completo em portugues>",
      "shortTitle": "<nome curto>",
      "enabled": <true|false>,
      "focus": "<grupo muscular principal ou Descanso e recuperacao>",
      "exercises": [
        {
          "id": "<ex-001, ex-002, etc>",
          "name": "<nome do exercicio em portugues>",
          "suggestedSets": <numero inteiro>,
          "suggestedReps": "<ex: 8-12 ou 15>",
          "restSeconds": <segundos inteiro>,
          "executionVideoUrl": "",
          "userVideoFileName": "",
          "aiFeedback": "<dica personalizada com foco no nivel e objetivo do usuario — mencione angulo, grip, tecnica ou variacao relevante>",
          "notes": "",
          "sets": [{ "enabled": true, "weight": 0, "reps": 0 }]
        }
      ]
    }
  ]
}

REGRAS FINAIS INEGOCIAVEIS:
- Dias de descanso: exercises: [] e focus: "Descanso e recuperacao"
- Intermediario: minimo 5, ideal 6-7 exercicios por dia ativo
- Avancado: minimo 6, ideal 7-8 exercicios por dia ativo
- Nao inclua texto fora do JSON
`.trim();

  const ALL_WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const trainingDayList = trainingAvailableDays
    ? trainingAvailableDays.split(",").map((d) => d.trim()).filter(Boolean)
    : [];
  const trainingDayCount = trainingDayList.length;

  // Monta linha descritiva do nivel para reforcar no input
  const expLabel = {
    "iniciante": "INICIANTE (nunca treinou ou menos de 6 meses)",
    "intermediario": "INTERMEDIARIO (6 meses a 5 anos de treino — minimo 5 exercicios por sessao)",
    "avancado": "AVANCADO (mais de 5 anos de treino — minimo 6 exercicios por sessao)",
  }[trainingExperience] || `"${trainingExperience || "nao informado"}"`;

  const trainingAgeLabel = trainingAge ? ` Tempo de treino declarado: ${trainingAge}.` : "";
  const minutesLabel = availableMinutes ? ` Duracao da sessao disponivel: ${availableMinutes} minutos.` : "";

  const result = await callOpenAi({
    accountId,
    generationType: "workout",
    expectJson: true,
    maxTokensOverride: 14000,
    instructions,
    input: [
      `Gere um protocolo de treino completo e atualizado.`,
      goal ? `Objetivo principal: ${goal}.` : "",
      `NIVEL DE EXPERIENCIA DO USUARIO: ${expLabel}.${trainingAgeLabel}${minutesLabel}`,
      `LEMBRE: para nivel intermediario gere MINIMO 5 exercicios por dia ativo (ideal 6-7). Para avancado MINIMO 6 (ideal 7-8). Iniciante 4-5.`,
      trainingDayCount > 0
        ? [
            `DIAS DE TREINO SELECIONADOS PELO USUARIO (${trainingDayCount} dias — OBRIGATORIO):`,
            `  Ativar (enabled: true): ${trainingDayList.join(", ")}.`,
            `  Descanso (enabled: false, exercises: []): ${ALL_WEEK_DAYS.filter((d) => !trainingDayList.includes(d)).join(", ")}.`,
            `  NAO altere esta selecao.`,
          ].join(" ")
        : "Distribua os dias de treino de forma equilibrada, nunca concentrando todos os descansos no final da semana.",
      `Consulte equipamentos disponiveis (preferences.gymEquipment), sinais de fadiga/sono/performance do ultimo checkin e historico de sessoes.`,
    ].filter(Boolean).join(" "),
  });

  // ── Post-processamento determinístico ───────────────────────────────────────
  // Independente do que o modelo retornou, aplica os dias selecionados pelo
  // usuário como verdade absoluta. Isso garante que a contagem de dias esteja
  // sempre correta mesmo quando o LLM ignora as instruções.
  let finalJson = result.json;
  if (finalJson && trainingDayList.length > 0 && Array.isArray(finalJson.workouts)) {
    const enabledSet = new Set(trainingDayList);
    finalJson = {
      ...finalJson,
      weeklyTrainingDays: trainingDayList.length,
      workouts: finalJson.workouts.map((w) => {
        if (enabledSet.has(w.id)) {
          return { ...w, enabled: true };
        }
        return {
          ...w,
          enabled: false,
          exercises: [],
          focus: "Descanso e recuperacao",
        };
      }),
    };
  }

  if (persist && finalJson) {
    const protocol = await saveWorkoutPlan(accountId, finalJson);
    await pool.query(
      `
        insert into ai_data_writes (account_id, ai_generation_run_id, target_table, target_id, action, payload)
        values ($1, $2, 'training_plans', $3, 'update', $4::jsonb);
      `,
      [accountId, result.run.id, protocol.id, JSON.stringify(protocol)]
    );
    return {
      run: result.publicRun,
      text: result.text,
      json: finalJson,
      protocol,
    };
  }

  return {
    run: result.publicRun,
    text: result.text,
    json: finalJson,
  };
}
