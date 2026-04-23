import { pool } from "../../utils/db.js";
import { loadAssistantContext } from "../assistant/assistant.service.js";
import { saveDietPlan } from "../diets/diets.service.js";
import { saveWorkoutPlan } from "../workouts/workouts.service.js";

const defaultModel = process.env.OPENAI_MODEL || "gpt-5";
const openAiUrl = "https://api.openai.com/v1/responses";

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

async function completeRun(runId, response, responseJson = null) {
  const usage = getUsage(response);
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
      response.output_text || "",
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

async function callOpenAi({ accountId, generationType, instructions, input, expectJson = false }) {
  requireOpenAiKey();

  const context = compactContext(await loadAssistantContext(accountId));
  const model = defaultModel;
  const inputMessages = [
    {
      role: "user",
      content: input,
    },
  ];
  const run = await createRun({
    accountId,
    generationType,
    model,
    instructions,
    inputMessages,
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
        instructions,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${input}\n\nContexto do usuario autenticado:\n${JSON.stringify(context)}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.error?.message || "Falha ao chamar OpenAI.");
      error.status = response.status;
      throw error;
    }

    const responseJson = expectJson ? extractJson(data.output_text) : null;
    const completedRun = await completeRun(run.id, data, responseJson);

    return {
      run: completedRun,
      publicRun: toPublicRun(completedRun),
      text: data.output_text || "",
      json: responseJson,
    };
  } catch (error) {
    await failRun(run.id, error);
    throw error;
  }
}

export async function generateAiChatResponse(accountId, { message }) {
  if (!String(message || "").trim()) {
    const error = new Error("Informe uma mensagem para o Personal Virtual.");
    error.status = 400;
    throw error;
  }

  const result = await callOpenAi({
    accountId,
    generationType: "chat",
    instructions:
      "Voce e o Personal Virtual do Shape Certo. Responda apenas com base no contexto do usuario autenticado. Nao invente dados clinicos, nao prescreva condutas medicas e sinalize quando faltar informacao.",
    input: String(message).trim(),
  });

  return {
    run: result.publicRun,
    text: result.text,
  };
}

export async function generateAiDietPlan(accountId, { goal, persist = false } = {}) {
  const result = await callOpenAi({
    accountId,
    generationType: "diet",
    expectJson: true,
    instructions:
      "Gere um plano alimentar em JSON valido para o Shape Certo. Use os campos title, nutritionalGoal, startDate, endDate, recommendedMeals, userAvailableMeals, restrictionNotes, preferenceNotes, guidance, meals e dayPlans. Respeite alergias, restricoes, preferencias e historico do usuario. Nao inclua texto fora do JSON.",
    input: `Monte um plano alimentar atualizado.${goal ? ` Objetivo informado: ${goal}` : ""}`,
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

export async function generateAiWorkoutPlan(accountId, { goal, persist = false } = {}) {
  const result = await callOpenAi({
    accountId,
    generationType: "workout",
    expectJson: true,
    instructions:
      "Gere um plano de treino em JSON valido para o Shape Certo. Use os campos weeklyTrainingDays, trainingShift, split, workouts e updatedAt. Cada treino deve ter id, title, shortTitle, enabled, focus e exercises. Cada exercicio deve ter id, name, suggestedSets, suggestedReps, restSeconds, executionVideoUrl, userVideoFileName, aiFeedback, notes e sets. Nao inclua texto fora do JSON.",
    input: `Monte um protocolo de treino atualizado.${goal ? ` Objetivo informado: ${goal}` : ""}`,
  });

  if (persist && result.json) {
    const protocol = await saveWorkoutPlan(accountId, result.json);
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
