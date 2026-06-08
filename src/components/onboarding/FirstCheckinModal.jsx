import { useState, useRef, useEffect } from "react";
import { saveCheckin, defaultCheckinForm } from "../../data/checkinStorage";
import { saveRemoteCheckin } from "../../services/checkinService";
import { generateWorkoutWithAi } from "../../services/ai/workout.service";
import { generateDietWithAi } from "../../services/ai/diet.service";
import { personalAvatarCatalog } from "../../data/platformImageCatalog";
import { saveRemoteSettings, loadRemoteSettings } from "../../services/settingsService";
import AiGeneratingScreen from "../shared/AiGeneratingScreen";
import "./FirstCheckinModal.css";

// ── Etapas por plano ────────────────────────────────────────────────────────

const PERSONAL_STEP = {
  id: "personal",
  title: "Seu Personal Virtual",
  subtitle: "Escolha o nome e o visual do seu Personal — ele aparece no chat e em cada protocolo.",
  fields: ["personalName", "personalAvatar"],
};

const NUTRITION_STEP = {
  id: "nutrition",
  title: "Alimentação",
  subtitle: "A IA usa essas informações para montar um plano alimentar que funciona pra você.",
  fields: ["mealsPerDay", "dietaryRestrictions", "foodPreferences"],
  optional: true,
};

// Etapa de composição corporal — Intermediário
// Pergunta bioimpedância básica + intenção de fotos
const BODY_INTER_STEP = {
  id: "body_inter",
  title: "Composição corporal",
  subtitle: "Com esses dados, a IA personaliza seu volume de treino, calorias e macros com muito mais precisão.",
  note: {
    icon: "💡",
    text: "Não tem acesso a uma balança de bioimpedância agora? Sem problema — clique em Pular etapa. Você pode inserir esses dados no check-in quando tiver, e a IA remonta os protocolos automaticamente.",
  },
  fields: ["bodyFat", "leanMass", "skeletalMuscleMass", "visceralFat", "totalBodyWater", "boneMass", "basalMetabolicRate", "photosAvailable"],
  optional: true,
};

// Etapa de composição corporal — Pro (análise completa)
const BODY_PRO_STEP = {
  id: "body_pro",
  title: "Bioimpedância e composição",
  subtitle: "O plano Pro usa análise completa de composição para calcular TDEE real, zona de treinamento e periodização com precisão científica.",
  note: {
    icon: "💡",
    text: "Se não tiver acesso à balança de bioimpedância agora, clique em Pular. No próximo check-in você pode inserir — a IA usa esses dados para regenerar os protocolos com ainda mais precisão.",
  },
  fields: ["bodyFat", "leanMass", "skeletalMuscleMass", "muscleMass", "visceralFat", "totalBodyWater", "boneMass", "basalMetabolicRate", "metabolicAge", "bmi", "photosAvailable"],
  optional: true,
};

// ── Fluxo unificado — todos os planos usam o mesmo onboarding simplificado ──
// Nível de experiência é derivado automaticamente de trainingLevel × trainingFrequency.
const STEPS_UNIFIED = [
  {
    id: "basics",
    title: "Seus dados básicos",
    subtitle: "Informações essenciais para o Personal Virtual montar seu protocolo.",
    fields: ["goal", "sex", "age", "height", "weight"],
  },
  {
    id: "training",
    title: "Treino e disponibilidade",
    subtitle: "Conte um pouco sobre sua experiência e disponibilidade para treinar.",
    fields: ["trainingAvailableDays", "trainingLevel", "trainingFrequency", "availableMinutes", "injuries", "trainingPreferenceFreeText"],
  },
  {
    id: "trainingfocus",
    title: "Foco do treino",
    subtitle: "Qual é a principal qualidade que você quer desenvolver? Isso define a estrutura do seu protocolo — rep range, volume, tipo de splits.",
    fields: ["trainingFocus"],
    optional: true,
  },
  {
    id: "bodygoal",
    title: "Como você quer seu corpo?",
    subtitle: "Essa resposta define sua estratégia alimentar. Com base no que você escolher, a IA vai calcular calorias, macros e tipo de dieta ideal.",
    fields: ["bodyGoal"],
    optional: true,
  },
  {
    ...NUTRITION_STEP,
    subtitle: "Essas informações ajudam a IA a montar um plano alimentar que você realmente vai seguir.",
  },
  {
    id: "body",
    title: "Composição corporal",
    subtitle: "Se tiver acesso a uma balança de bioimpedância, esses dados tornam o protocolo muito mais preciso.",
    note: {
      icon: "💡",
      text: "Não tem bioimpedância agora? Sem problema — clique em Pular etapa. Você pode inserir esses dados no próximo check-in e a IA remonta os protocolos.",
    },
    fields: ["bodyFat", "leanMass", "visceralFat", "basalMetabolicRate"],
    optional: true,
  },
  {
    id: "goals",
    title: "Suas expectativas",
    subtitle: "Conte o que espera alcançar — quanto mais detalhes, melhor.",
    fields: ["notes"],
    optional: true,
  },
  {
    id: "summary",
    title: "Seu perfil está pronto",
    subtitle: "Veja o protocolo que o Personal Virtual vai montar para você — antes de entrar no app.",
    fields: ["_summary"],
  },
  PERSONAL_STEP,
];

const STEPS = {
  basico:        STEPS_UNIFIED,
  intermediario: STEPS_UNIFIED,
  pro:           STEPS_UNIFIED,
};

// ── Nível de experiência unificado ────────────────────────────────────────────
// Uma única pergunta que infere automaticamente trainingExperience + trainingAge

export const TRAINING_LEVEL_OPTIONS = [
  {
    id: "nunca",
    label: "Nunca treinei",
    sublabel: "Iniciante",
    badge: "🌱",
    hint: "Começando do zero — a IA monta tudo com base no seu objetivo",
    experience: "iniciante",
    age: "nunca",
  },
  {
    id: "menos-1-ano",
    label: "Menos de 1 ano treinando",
    sublabel: "Iniciante",
    badge: "💪",
    hint: "Menos de 12 meses — ainda na fase de adaptação e aprendizado dos movimentos",
    experience: "iniciante",
    age: "menos-6-meses",
  },
  {
    id: "1-3-anos",
    label: "1 a 3 anos treinando",
    sublabel: "Intermediário",
    badge: "🔥",
    hint: "Já domina os movimentos básicos e tem consistência no treino",
    experience: "intermediario",
    age: "1-2-anos",
  },
  {
    id: "3-5-anos",
    label: "3 a 5 anos treinando",
    sublabel: "Intermediário",
    badge: "⚡",
    hint: "Treinamento sólido com bom controle de volume e técnica",
    experience: "intermediario",
    age: "2-5-anos",
  },
  {
    id: "mais-5-anos",
    label: "Mais de 5 anos treinando",
    sublabel: "Avançado",
    badge: "🏆",
    hint: "Alto domínio técnico, periodi­zação e otimização de volume",
    experience: "avancado",
    age: "mais-5-anos",
  },
];

const TRAINING_LEVEL_MAP = Object.fromEntries(
  TRAINING_LEVEL_OPTIONS.map(o => [o.id, { experience: o.experience, age: o.age }])
);

// ── Frequência semanal de treino ──────────────────────────────────────────────
export const TRAINING_FREQUENCY_OPTIONS = [
  { id: "1x",   label: "1x por semana",    badge: "🚶", hint: "Treino leve — adaptação muito gradual" },
  { id: "2x",   label: "2x por semana",    badge: "🏃", hint: "Base sólida — bom para iniciantes consistentes" },
  { id: "3-4x", label: "3–4x por semana",  badge: "💪", hint: "Frequência ideal para a maioria dos objetivos" },
  { id: "5x",   label: "5+ vezes/semana",  badge: "🔥", hint: "Alta dedicação — adaptação acelerada" },
];

// ── Derivação de experiência real: tempo × frequência ────────────────────────
// Matriz: (trainingLevel) × (trainingFrequency) → { experience, age }
// Lógica: frequência baixa comprime o volume acumulado, "downgradeando" o nível.
function deriveTrainingExperience(levelId, frequencyId) {
  if (!levelId || levelId === "nunca") return { experience: "iniciante", age: "nunca" };

  const isLow  = frequencyId === "1x" || frequencyId === "2x";
  const isHigh = frequencyId === "5x";

  if (levelId === "menos-1-ano") {
    // < 1 ano: sempre iniciante independente da frequência
    return { experience: "iniciante", age: isHigh ? "menos-6-meses" : "nunca" };
  }
  if (levelId === "1-3-anos") {
    // 1–3 anos: só sobe para intermediário se treinava ≥ 3x/semana
    return isLow
      ? { experience: "iniciante",     age: "menos-6-meses" }
      : { experience: "intermediario", age: "1-2-anos" };
  }
  if (levelId === "3-5-anos") {
    return isLow
      ? { experience: "iniciante",     age: "1-2-anos" }
      : { experience: "intermediario", age: "2-5-anos" };
  }
  if (levelId === "mais-5-anos") {
    if (isLow)   return { experience: "intermediario", age: "1-2-anos" };
    if (isHigh)  return { experience: "avancado",      age: "mais-5-anos" };
    return         { experience: "intermediario",      age: "2-5-anos" };
  }
  return TRAINING_LEVEL_MAP[levelId] || { experience: "iniciante", age: "menos-6-meses" };
}

// ── Abordagem de dieta por objetivo ──────────────────────────────────────────
const DIET_APPROACH_OPTIONS = {
  gain: [
    { id: "bulk-limpo",       label: "Bulk Limpo",       badge: "🥗", tagline: "Crescer com qualidade",                description: "Superávit moderado (~200–300 kcal), alimentos limpos, ricos em proteínas e fibras. Crescimento lento com pouco acúmulo de gordura. Boa opção para quem não quer perder a definição enquanto cresce." },
    { id: "bulk-inteligente", label: "Bulk Inteligente", badge: "📊", tagline: "Superávit calculado semana a semana",  description: "Superávit de ~300–500 kcal ajustado pelo check-in semanal. Monitora peso e composição continuamente para maximizar ganho muscular com controle ativo de gordura." },
    { id: "bulk-sujo",        label: "Bulk Sujo",        badge: "🔥", tagline: "Máximo crescimento, sem restrições",  description: "Superávit alto (+500 kcal). Prioridade total no volume muscular — refeições calóricas são bem-vindas. Aceita ganho de gordura junto: o foco é crescer agora e definir depois." },
    { id: "recomposicao",     label: "Recomposição",     badge: "⚖️", tagline: "Ganhar músculo e perder gordura",    description: "Calorias próximas ao gasto total. Processo mais lento, mas muda a composição sem ciclos separados de bulk e cutting. Ideal para iniciantes e intermediários com gordura corporal moderada." },
  ],
  loss: [
    { id: "cutting-conservador", label: "Cutting Conservador", badge: "🌿", tagline: "Perder gordura preservando músculo",     description: "Déficit leve (~200–300 kcal). Resultados graduais — perde gordura devagar mas preserva ao máximo a massa magra. Ideal para quem já tem boa composição e quer refinar." },
    { id: "cutting-moderado",    label: "Cutting Moderado",    badge: "⚡", tagline: "Equilíbrio entre velocidade e músculo",  description: "Déficit de ~400–500 kcal. O protocolo mais utilizado — velocidade razoável de perda de gordura com boa retenção muscular. Recomendado para a maioria dos objetivos de emagrecimento." },
    { id: "cutting-agressivo",   label: "Cutting Agressivo",   badge: "🔥", tagline: "Emagrecimento rápido",                 description: "Déficit de ~600–800 kcal. Resultados visíveis em poucas semanas. Exige proteína alta para minimizar perda muscular. Indicado para quem tem urgência ou excesso significativo de gordura." },
  ],
  neutral: [
    { id: "recomposicao", label: "Recomposição Corporal", badge: "💫", tagline: "Ganhar músculo e perder gordura",   description: "Calorias em equilíbrio ou leve variação cíclica. Muda a composição corporal de forma sustentável, sem ciclos extremos. Mais lento que bulk ou cutting — mas sem as oscilações." },
    { id: "manutencao",   label: "Manutenção Ativa",      badge: "⚖️", tagline: "Manter o peso com saúde e performance", description: "Calorias no ponto de equilíbrio do gasto diário. Foco em qualidade alimentar, desempenho esportivo e bem-estar. Ideal para quem está satisfeito com o peso e quer manter a forma." },
  ],
};

function getDietApproachOptions(goal) {
  if (["hipertrofia", "powerlifting"].includes(goal)) return DIET_APPROACH_OPTIONS.gain;
  if (["emagrecimento", "cutting"].includes(goal))    return DIET_APPROACH_OPTIONS.loss;
  return DIET_APPROACH_OPTIONS.neutral;
}

// ── Foco do treino ─────────────────────────────────────────────────────────────
const TRAINING_FOCUS_OPTIONS = [
  { id: "hipertrofia",    label: "Hipertrofia",            badge: "💪", tagline: "Crescimento muscular",           description: "Volume alto, 8–15 reps, foco em tensão mecânica e tempo sob tensão. Treinos divididos por grupo muscular com progressão de carga contínua." },
  { id: "forca",          label: "Força Máxima",           badge: "🏋️", tagline: "Mover mais peso",               description: "3–6 repetições, cargas altas, longas pausas entre séries. Periodização de força com ênfase nos movimentos fundamentais: agachamento, supino e levantamento terra." },
  { id: "resistencia",    label: "Resistência Muscular",   badge: "🏃", tagline: "Aguentar mais por mais tempo",   description: "15–25 reps, descanso curto. Treino em circuito ou alta densidade de volume. Desenvolve capacidade de manter intensidade por mais tempo." },
  { id: "condicionamento",label: "Condicionamento",        badge: "🔥", tagline: "Queima calórica e cardio",       description: "Circuitos de alta intensidade e exercícios funcionais. Foco em gasto calórico elevado e melhora da performance cardiovascular." },
  { id: "funcional",      label: "Funcional / Mobilidade", badge: "🧘", tagline: "Qualidade de movimento",         description: "Exercícios multiplanares, mobilidade articular e estabilidade. Foco em longevidade, prevenção de lesões e qualidade de movimento no dia a dia." },
];

// ── Objetivo corporal — perguntas em linguagem natural que derivam a estratégia alimentar ──
// O usuário NÃO vê "Bulk Limpo" / "Cutting" nessa etapa — só no resumo final.
const BODY_GOAL_OPTIONS = {
  // Quem quer ganhar massa (hipertrofia, powerlifting)
  gain: [
    {
      id: "corpo-seco",
      label: "Quero crescer mantendo o corpo mais definido",
      badge: "🥗",
      tagline: "Aceito um ritmo mais lento para preservar a definição",
      description: "A IA vai montar uma dieta com superávit moderado e alimentos de qualidade. Você cresce com pouco acúmulo de gordura — ideal para quem não abre mão da definição.",
      implies: "bulk-limpo",
    },
    {
      id: "crescer-controlado",
      label: "Quero crescer de forma estratégica e monitorada",
      badge: "📊",
      tagline: "Prefiro ajustar semana a semana conforme evoluo",
      description: "Superávit calculado e ajustado pelo check-in. A IA monitora sua composição e calibra as calorias continuamente para maximizar o ganho muscular.",
      implies: "bulk-inteligente",
    },
    {
      id: "maximo-crescimento",
      label: "Quero priorizar o máximo de crescimento agora",
      badge: "🔥",
      tagline: "A definição vem depois — agora é fase de crescimento",
      description: "Dieta hipercalórica voltada para volume máximo. A fase de definição vem em um segundo momento — agora o foco é crescer.",
      implies: "bulk-sujo",
    },
    {
      id: "ganhar-e-perder",
      label: "Quero ganhar músculo e perder gordura ao mesmo tempo",
      badge: "⚖️",
      tagline: "Sem extremos — quero melhorar minha composição gradualmente",
      description: "A IA calibra as calorias para recomposição. Processo mais lento, mas muda a composição sem ciclos extremos de ganho e definição.",
      implies: "recomposicao",
    },
  ],
  // Quem quer emagrecer (emagrecimento, cutting)
  loss: [
    {
      id: "emagrecer-suave",
      label: "Quero emagrecer devagar, preservando o músculo",
      badge: "🌿",
      tagline: "Prefiro um ritmo gradual — não quero perder o que já tenho",
      description: "Déficit leve. A IA prioriza proteína alta para proteger a massa magra durante todo o processo. Resultado mais sustentável.",
      implies: "cutting-conservador",
    },
    {
      id: "emagrecer-equilibrio",
      label: "Quero emagrecer bem, sem sacrificar muito o músculo",
      badge: "⚡",
      tagline: "Equilíbrio entre velocidade e preservação muscular",
      description: "Déficit moderado — o protocolo mais utilizado. Bom ritmo de perda de gordura com boa retenção muscular.",
      implies: "cutting-moderado",
    },
    {
      id: "emagrecer-rapido",
      label: "Quero resultados rápidos — aceito um processo mais intenso",
      badge: "🔥",
      tagline: "Priorizo velocidade — aceito um cutting mais agressivo",
      description: "Déficit agressivo. A IA vai maximizar a perda de gordura com proteína alta para minimizar a perda muscular. Indicado para quem tem urgência.",
      implies: "cutting-agressivo",
    },
  ],
  // Outros objetivos (recomposição, condicionamento, saúde)
  neutral: [
    {
      id: "melhorar-composicao",
      label: "Quero melhorar minha composição corporal",
      badge: "💫",
      tagline: "Menos gordura e mais músculo — sem extremos",
      description: "A IA vai calibrar para recomposição — processo sustentável sem ciclos extremos. Mais lento, mas com mudanças reais na composição.",
      implies: "recomposicao",
    },
    {
      id: "manter-com-saude",
      label: "Quero manter meu peso com saúde e desempenho",
      badge: "⚖️",
      tagline: "Estou bem — quero manter a forma com qualidade",
      description: "Calorias no ponto de equilíbrio. Foco em qualidade alimentar, desempenho e bem-estar. A IA otimiza para manutenção.",
      implies: "manutencao",
    },
  ],
};

function getBodyGoalOptions(goal) {
  if (["hipertrofia", "powerlifting"].includes(goal)) return BODY_GOAL_OPTIONS.gain;
  if (["emagrecimento", "cutting"].includes(goal))    return BODY_GOAL_OPTIONS.loss;
  return BODY_GOAL_OPTIONS.neutral;
}

// Todos os body goals em lista plana para lookup
const ALL_BODY_GOALS = [
  ...BODY_GOAL_OPTIONS.gain,
  ...BODY_GOAL_OPTIONS.loss,
  ...BODY_GOAL_OPTIONS.neutral,
];

// ── Resumo do perfil completo ─────────────────────────────────────────────────
function buildProfileSummary(form) {
  const allApproaches = [
    ...DIET_APPROACH_OPTIONS.gain,
    ...DIET_APPROACH_OPTIONS.loss,
    ...DIET_APPROACH_OPTIONS.neutral,
  ];
  const dietOpt     = allApproaches.find(a => a.id === form.dietApproach);
  const trainingOpt = TRAINING_FOCUS_OPTIONS.find(f => f.id === form.trainingFocus);
  const levelLabel  = form.trainingExperience === "avancado" ? "Avançado"
    : form.trainingExperience === "intermediario" ? "Intermediário" : "Iniciante";
  const GOAL_LABELS = {
    hipertrofia: "Hipertrofia", powerlifting: "Força / Powerlifting",
    emagrecimento: "Emagrecimento", recomposicao: "Recomposição corporal",
    cutting: "Cutting (definição)", condicionamento: "Condicionamento físico", saude: "Saúde geral",
  };
  return {
    goalLabel: GOAL_LABELS[form.goal] || form.goal,
    dietOpt, trainingOpt, levelLabel,
    trainingDaysCount: form.trainingAvailableDays
      ? form.trainingAvailableDays.split(",").filter(Boolean).length : 0,
  };
}

const WEEK_DAYS = [
  { id: "monday",    short: "SEG" }, { id: "tuesday",   short: "TER" },
  { id: "wednesday", short: "QUA" }, { id: "thursday",  short: "QUI" },
  { id: "friday",    short: "SEX" }, { id: "saturday",  short: "SAB" },
  { id: "sunday",    short: "DOM" },
];

const FIELD_DEFS = {
  goal:               { label: "Objetivo principal", type: "select", required: true,
                        options: [
                          ["hipertrofia","Hipertrofia — ganho de massa muscular"],
                          ["powerlifting","Powerlifting / Força máxima"],
                          ["emagrecimento","Emagrecimento"],
                          ["recomposicao","Recomposição corporal"],
                          ["cutting","Cutting (definição muscular)"],
                          ["condicionamento","Condicionamento físico"],
                          ["saude","Saúde geral"],
                        ] },
  sex:                { label: "Sexo biológico",     type: "select", required: true,
                        options: [["","Selecione"],["masculino","Masculino"],["feminino","Feminino"]] },
  age:                { label: "Idade",              type: "text",   required: true, placeholder: "Ex: 28" },
  height:             { label: "Altura (cm)",        type: "text",   required: true, placeholder: "Ex: 178" },
  weight:             { label: "Peso atual (kg)",    type: "text",   required: true, placeholder: "Ex: 85.4" },
  trainingAvailableDays: { label: "Quais dias pode treinar", type: "daypicker", required: false,
                            hint: "Marque os dias com disponibilidade real. A IA distribui os treinos com folgas bem posicionadas." },
  trainingLevel:      { label: "Há quanto tempo você treina?", type: "traininglevel", required: false },
  trainingFrequency:  { label: "Com que frequência você treinava?", type: "trainingfrequency", required: false,
                        hint: "Frequência média no período que você mencionou — isso calibra seu nível real de adaptação" },
  // trainingExperience e trainingAge são derivados automaticamente de trainingLevel × trainingFrequency
  availableMinutes:   { label: "Tempo por sessão", type: "select", required: false,
                        options: [["","Selecione"],["30","30 min"],["45","45 min"],["60","60 min"],["75","75 min"],["90","90 min"],["120","120 min ou mais"]] },
  trainingPreference: { label: "Preferência de divisão de treino", type: "select", required: false,
                        options: [
                          ["","Deixar a IA decidir o melhor split (recomendado)"],
                          ["full_body","Full Body — treino global em cada sessão"],
                          ["upper_lower","Upper / Lower — divisão superior e inferior"],
                          ["ppl","Push / Pull / Legs"],
                          ["abc","ABC — por grupo muscular (Peito+Tri / Costas+Bi / Pernas+Ombros)"],
                          ["abcd","ABCD — 4 divisões"],
                          ["abcde","ABCDE — 5 divisões"],
                          ["powerlifting_split","Periodização Powerlifting (Squat / Bench / Deadlift)"],
                        ],
                        hint: "Opcional — se deixar em branco, a IA escolhe o split ideal para seu objetivo e disponibilidade" },
  injuries:           { label: "Lesões ou limitações", type: "textarea", required: false,
                        placeholder: "Ex: dor no joelho, hérnia L4-L5", hint: "Deixe em branco se não tiver" },
  energy:             { label: "Energia hoje (1–10)", type: "select", required: false,
                        options: [["","Selecione"],...Array.from({length:10},(_,i)=>[String(i+1),String(i+1)])] },
  sleepQuality:       { label: "Qualidade do sono", type: "select", required: false,
                        options: [["","Selecione"],["1","Muito ruim"],["2","Ruim"],["3","Regular"],["4","Boa"],["5","Ótima"]] },
  fatigueLevel:       { label: "Nível de fadiga (1–10)", type: "select", required: false,
                        options: [["","Selecione"],...Array.from({length:10},(_,i)=>[String(i+1),String(i+1)])] },
  trainingPerformance:{ label: "Performance no treino", type: "select", required: false,
                        options: [["","Selecione"],["abaixo-media","Abaixo da média"],["media","Na média"],["acima-media","Acima da média"],["excelente","Excelente"]] },
  mealsPerDay:        { label: "Quantas refeições por dia?", type: "select", required: false,
                        options: [["","Selecione"],["3","3 refeições"],["4","4 refeições"],["5","5 refeições"],["6","6 refeições"],["7","7 ou mais"]],
                        hint: "A IA monta o plano com o número de refeições que você consegue fazer" },
  dietaryRestrictions:{ label: "Restrições alimentares", type: "textarea", required: false,
                        placeholder: "Ex: intolerância à lactose, sem glúten, vegano, alergia a amendoim", hint: "Deixe em branco se não tiver" },
  foodPreferences:    { label: "Preferências alimentares", type: "textarea", required: false,
                        placeholder: "Ex: gosto de frango e ovos, não gosto de peixe, como muito arroz e feijão", hint: "Opcional — mas ajuda muito a IA a montar algo que você vai comer" },
  bodyFat:            { label: "Gordura corporal (%)", type: "text", required: false,
                        placeholder: "Ex: 18.5", hint: "% de gordura corporal total — encontrado no relatório da bioimpedância" },
  leanMass:           { label: "Massa magra (kg)", type: "text", required: false,
                        placeholder: "Ex: 68.2", hint: "Massa sem gordura (músculos + ossos + água) — da bioimpedância" },
  visceralFat:        { label: "Gordura visceral (índice)", type: "text", required: false,
                        placeholder: "Ex: 8", hint: "Índice de gordura visceral da bioimpedância — geralmente entre 1 e 20 (saudável: abaixo de 10)" },
  muscleMass:         { label: "Massa muscular esquelética (kg)", type: "text", required: false,
                        placeholder: "Ex: 42.1", hint: "Massa muscular esquelética total — da bioimpedância (se disponível)" },
  skeletalMuscleMass: { label: "Massa muscular esquelética (kg)", type: "text", required: false,
                        placeholder: "Ex: 38.0", hint: "Massa muscular esquelética total da balança de bioimpedância" },
  totalBodyWater:     { label: "Água corporal total (%)", type: "text", required: false,
                        placeholder: "Ex: 57.2", hint: "% de água corporal total da bioimpedância" },
  boneMass:           { label: "Massa óssea (kg)", type: "text", required: false,
                        placeholder: "Ex: 3.4", hint: "Massa óssea da bioimpedância" },
  basalMetabolicRate: { label: "Taxa metabólica basal (kcal)", type: "text", required: false,
                        placeholder: "Ex: 1840", hint: "Calorias em repouso — da balança ou calculada" },
  metabolicAge:       { label: "Idade metabólica", type: "text", required: false,
                        placeholder: "Ex: 28", hint: "Idade metabólica da bioimpedância (se disponível)" },
  bmi:                { label: "IMC", type: "text", required: false,
                        placeholder: "Ex: 26.7", hint: "Índice de massa corporal" },
  photosAvailable:    { label: "Você tem fotos de progresso disponíveis?", type: "select", required: false,
                        options: [
                          ["","Selecione"],
                          ["sim","Sim — vou adicionar no primeiro check-in"],
                          ["nao","Ainda não tenho fotos"],
                          ["nao-enviar","Prefiro não enviar fotos por enquanto"],
                        ],
                        hint: "Fotos de frente e de lado permitem análise visual de postura, simetria e composição muscular. Você pode enviá-las na tela de Check-in." },
  trainingPreferenceFreeText: {
    label: "Alguma preferência de treino?",
    type: "textarea", required: false,
    placeholder: "Ex: prefiro máquinas, gosto de treinar peito e costas juntos, quero focar em pernas, não gosto de muito descanso entre séries...",
    hint: "Opcional — conte qualquer preferência ou contexto. A IA usa isso ao montar seu protocolo.",
  },
  muscleGroupCombinations: {
    label: "Combinações de grupos musculares preferidas",
    type: "musclegroupicker", required: false,
    hint: "Selecione as combinações que mais gosta. A IA priorizará essas divisões.",
  },
  favoriteExercises: {
    label: "Exercícios favoritos",
    type: "textarea", required: false,
    placeholder: "Ex.: Supino com barra, Agachamento livre, Rosca direta, Puxada no pulley...",
    hint: "A IA prioriza esses exercícios ao montar seu protocolo",
  },
  workoutDayProtocol: {
    label: "Protocolo por dia de treino",
    type: "dayprotocol", required: false,
    hint: "Defina quais grupos musculares você quer treinar em cada dia. Opcional — se deixar vazio, a IA decide.",
  },
  bodyGoal:           { label: "Como você quer seu corpo?", type: "bodygoal", required: false,
                        hint: "A IA usa essa resposta para definir sua estratégia alimentar — calorias, macros e tipo de dieta" },
  dietApproach:       { label: "Como você quer se alimentar?", type: "dietapproach", required: false,
                        hint: "Escolha a abordagem que mais combina com você — a IA vai calibrar calorias e macros com base nisso" },
  trainingFocus:      { label: "Qual é o foco do seu treino?", type: "trainingfocus", required: false,
                        hint: "Isso define o rep range, volume e estrutura do protocolo gerado" },
  _summary:           { label: "Resumo do protocolo", type: "profilesummary" },
  notes:              { label: "Expectativas e contexto", type: "textarea", required: false,
                        placeholder: "Conte o que espera alcançar, sua rotina atual, qualquer informação relevante...",
                        hint: "Quanto mais você descrever, mais preciso o protocolo inicial" },
  personalName:       { label: "Nome do Personal Virtual", type: "text", required: false,
                        placeholder: "Ex: Alex, Marina, Coach, Lucas...",
                        hint: "Deixe em branco para usar 'Personal Virtual'" },
  personalAvatar:     { label: "Avatar", type: "avatarpicker", required: false },
};

// ── Combinações de grupos musculares por sexo ─────────────────────────────────

const MUSCLE_COMBOS_MASC = [
  // ── Splits clássicos ────────────────────────────────────────────────────────
  { id: "full_body",           label: "Full Body" },
  { id: "upper_lower",         label: "Superior + Inferior" },
  { id: "push",                label: "Push (Peito + Ombros + Tríceps)" },
  { id: "pull",                label: "Pull (Costas + Bíceps + Deltoide Post.)" },
  { id: "legs",                label: "Legs (Quad + Post + Glúteo + Panturrilha)" },
  // ── Por grupo muscular (ABC/ABCD) ───────────────────────────────────────────
  { id: "peito_tri",           label: "Peito + Tríceps" },
  { id: "costas_bi",           label: "Costas + Bíceps" },
  { id: "ombros_trap",         label: "Ombros + Trapézio" },
  { id: "peito_ombros",        label: "Peito + Ombros" },
  { id: "costas_del_post",     label: "Costas + Deltoide Posterior" },
  // ── Antagonistas (ciência do treino) ────────────────────────────────────────
  { id: "peito_costas",        label: "Peito + Costas (antagonistas)" },
  { id: "peito_bi",            label: "Peito + Bíceps (antagônico)" },
  { id: "costas_tri",          label: "Costas + Tríceps (antagônico)" },
  { id: "quad_posterior",      label: "Quadríceps + Posteriores (antagonistas)" },
  // ── Cadeia anterior / posterior ─────────────────────────────────────────────
  { id: "cadeia_anterior",     label: "Cadeia Anterior (Quad + Peito + Bíceps)" },
  { id: "cadeia_posterior",    label: "Cadeia Posterior (Post + Costas + Glúteo)" },
  // ── Grupos isolados / auxiliares ────────────────────────────────────────────
  { id: "bracos",              label: "Braços (Bíceps + Tríceps)" },
  { id: "ombros_bracos",       label: "Ombros + Braços" },
  { id: "pernas_completas",    label: "Pernas completas (Quad + Post + Glúteo)" },
  { id: "core_abdomen",        label: "Core + Abdômen" },
];

const MUSCLE_COMBOS_FEM = [
  // ── Foco inferior (prioridade feminina) ─────────────────────────────────────
  { id: "gluteos_iso",         label: "Glúteo isolado" },
  { id: "gluteos_posterior",   label: "Glúteos + Posteriores" },
  { id: "gluteos_core",        label: "Glúteos + Core" },
  { id: "pernas_completas",    label: "Pernas completas (Quad + Post + Glúteo)" },
  { id: "quad_gluteos",        label: "Quadríceps + Glúteos (cadeia anterior)" },
  { id: "posterior_panturr",   label: "Posteriores + Panturrilha" },
  { id: "adutor_gluteos",      label: "Adutores + Glúteos (isolamento)" },
  { id: "lower",               label: "Inferior completo" },
  // ── Splits global / superior ────────────────────────────────────────────────
  { id: "full_body",           label: "Full Body" },
  { id: "upper_lower",         label: "Superior + Inferior" },
  { id: "upper",               label: "Superior completo" },
  // ── Push / Pull adaptado ────────────────────────────────────────────────────
  { id: "push",                label: "Push (Peito + Ombros + Tríceps)" },
  { id: "pull",                label: "Pull (Costas + Bíceps + Deltoide Post.)" },
  // ── Grupos superiores combinados ────────────────────────────────────────────
  { id: "costas_bi",           label: "Costas + Bíceps" },
  { id: "peito_ombros",        label: "Peito + Ombros" },
  { id: "peito_tri",           label: "Peito + Tríceps" },
  { id: "ombros_bracos",       label: "Ombros + Braços" },
  // ── Cadeia posterior completa ───────────────────────────────────────────────
  { id: "cadeia_posterior",    label: "Cadeia Posterior (Post + Costas + Glúteo)" },
  // ── Core / funcional ────────────────────────────────────────────────────────
  { id: "core_abdomen",        label: "Core + Abdômen" },
];

// ── Grupos musculares disponíveis para o protocolo por dia ───────────────────
const ALL_MUSCLE_GROUPS_MASC = [
  { id: "peito",     label: "Peito" },
  { id: "costas",    label: "Costas" },
  { id: "ombros",    label: "Ombros" },
  { id: "triceps",   label: "Tríceps" },
  { id: "biceps",    label: "Bíceps" },
  { id: "pernas",    label: "Pernas" },
  { id: "gluteos",   label: "Glúteos" },
  { id: "trapezio",  label: "Trapézio" },
  { id: "abdomen",   label: "Abdômen" },
  { id: "panturrilha", label: "Panturrilha" },
];

const ALL_MUSCLE_GROUPS_FEM = [
  { id: "gluteos",   label: "Glúteos" },
  { id: "pernas",    label: "Pernas" },
  { id: "costas",    label: "Costas" },
  { id: "ombros",    label: "Ombros" },
  { id: "peito",     label: "Peito" },
  { id: "biceps",    label: "Bíceps" },
  { id: "triceps",   label: "Tríceps" },
  { id: "abdomen",   label: "Abdômen" },
  { id: "panturrilha", label: "Panturrilha" },
  { id: "trapezio",  label: "Trapézio" },
];

const SPLIT_DAY_LABELS = {
  full_body: ["Treino A", "Treino B", "Treino C"],
  upper_lower: ["Superior A", "Inferior A", "Superior B", "Inferior B"],
  ppl: ["Push", "Pull", "Legs"],
  abc: ["Treino A", "Treino B", "Treino C"],
  abcd: ["Treino A", "Treino B", "Treino C", "Treino D"],
  abcde: ["Treino A", "Treino B", "Treino C", "Treino D", "Treino E"],
  powerlifting_split: ["Agachamento", "Supino", "Terra", "Acessórios"],
};

function WorkoutDayProtocolBuilder({ value = "", onChange, trainingPreference = "", sex = "" }) {
  const dayLabels = SPLIT_DAY_LABELS[trainingPreference] || ["Treino A", "Treino B", "Treino C"];
  const muscleGroups = sex === "feminino" ? ALL_MUSCLE_GROUPS_FEM : ALL_MUSCLE_GROUPS_MASC;

  // Parse value: "A:peito,costas;B:biceps,triceps"
  function parseProtocol(raw) {
    const result = {};
    if (!raw) return result;
    raw.split(";").forEach(part => {
      const [label, muscles] = part.split(":");
      if (label && muscles) result[label.trim()] = muscles.split(",").filter(Boolean);
    });
    return result;
  }

  function serializeProtocol(proto) {
    return Object.entries(proto)
      .filter(([, muscles]) => muscles.length > 0)
      .map(([label, muscles]) => `${label}:${muscles.join(",")}`)
      .join(";");
  }

  const protocol = parseProtocol(value);

  function toggleMuscle(dayLabel, muscleId) {
    const current = protocol[dayLabel] || [];
    const next = current.includes(muscleId)
      ? current.filter(m => m !== muscleId)
      : [...current, muscleId];
    const updated = { ...protocol, [dayLabel]: next };
    onChange(serializeProtocol(updated));
  }

  return (
    <div className="ob-day-protocol">
      {dayLabels.map(dayLabel => {
        const selected = protocol[dayLabel] || [];
        return (
          <div key={dayLabel} className="ob-day-protocol__day">
            <span className="ob-day-protocol__day-label">{dayLabel}</span>
            <div className="ob-day-protocol__muscles">
              {muscleGroups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  className={`ob-day-protocol__muscle-btn${selected.includes(g.id) ? " is-active" : ""}`}
                  onClick={() => toggleMuscle(dayLabel, g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildInitialForm() {
  const defaults = { cadence: "weekly" };
  for (const [key, def] of Object.entries(FIELD_DEFS)) {
    if (def.type === "select" && def.options?.[0]?.[0] !== "") {
      defaults[key] = def.options[0][0];
    }
  }
  return defaults;
}

// ── Modal principal ──────────────────────────────────────────────────────────

export default function FirstCheckinModal({ planId, onComplete }) {
  const steps = STEPS[planId] ?? STEPS.intermediario;
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState(buildInitialForm);
  const [saving, setSaving] = useState(false);

  // Estados da tela de geração
  const [showGen, setShowGen]             = useState(false);
  const [workoutStatus, setWorkoutStatus] = useState("generating"); // generating | ok | error
  const [dietStatus, setDietStatus]       = useState("generating");
  const [workoutError, setWorkoutError]   = useState(null);
  const [dietError, setDietError]         = useState(null);

  // form snapshot para uso nos retries
  const [savedGoal, setSavedGoal]                               = useState("");
  const [savedTrainingDays, setSavedTrainingDays]               = useState("");
  const [savedTrainingExp, setSavedTrainingExp]                 = useState("");
  const [savedTrainingAge, setSavedTrainingAge]                 = useState("");
  const [savedAvailableMinutes, setSavedAvailableMinutes]       = useState("");
  const [savedTrainingPreference, setSavedTrainingPreference]   = useState("");
  const [savedFavoriteExercises, setSavedFavoriteExercises]     = useState("");
  const [savedWorkoutDayProtocol, setSavedWorkoutDayProtocol]   = useState("");

  const currentStep = steps[step];
  const isLast  = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const required  = currentStep.fields.filter(f => FIELD_DEFS[f]?.required);
  const canAdvance = required.every(f => {
    const v = form[f];
    return v !== undefined && v !== "" && v !== null;
  });

  function handleChange(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "trainingAvailableDays") {
        next.weeklyTrainingDays = value ? String(value.split(",").filter(Boolean).length) : "";
      }
      if (field === "bodyGoal") {
        const opt = ALL_BODY_GOALS.find(o => o.id === value);
        if (opt) next.dietApproach = opt.implies;
      }
      if (field === "trainingLevel" || field === "trainingFrequency") {
        const levelId = field === "trainingLevel" ? value : (prev.trainingLevel || "");
        const freqId  = field === "trainingFrequency" ? value : (prev.trainingFrequency || "");
        const derived = deriveTrainingExperience(levelId, freqId);
        next.trainingExperience = derived.experience;
        next.trainingAge        = derived.age;
      }
      return next;
    });
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // 1 — Salva check-in local e remoto
      // Todos os usuários iniciam como iniciantes — o app foca nesse perfil
      const payload = {
        ...defaultCheckinForm,
        ...form,
        cadence: "weekly",
        trainingExperience: form.trainingExperience || "iniciante",
        trainingAge:        form.trainingAge        || "menos-6-meses",
      };
      const updated = saveCheckin(payload, { createdAt: new Date().toISOString() });
      await saveRemoteCheckin(updated[0]).catch(() => {});

      // 2 — Salva avatar e nome do Personal nas configurações (local + remoto)
      const personalName   = (form.personalName || "").trim() || "Personal Virtual";
      const personalAvatar = form.personalAvatar || "default-personal";

      // 2a — localStorage (fallback imediato)
      const SETTINGS_KEY = "shapeCertoSettings";
      const existing = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        ...existing,
        personal: {
          ...(existing.personal || {}),
          name: personalName,
          avatarId: personalAvatar,
        },
      }));

      // 2b — Persiste no backend para sobreviver à limpeza do localStorage (iOS Safari)
      //      Carrega as configurações existentes para não sobrescrever notificações/privacidade
      loadRemoteSettings()
        .then(({ settings: remote }) => {
          const merged = {
            ...(remote || {}),
            personal: {
              ...(remote?.personal || {}),
              name: personalName,
              avatarId: personalAvatar,
            },
          };
          return saveRemoteSettings(merged);
        })
        .catch(() => {}); // falha silenciosa — não bloqueia o onboarding

      // 3 — Salva snapshot dos dados para usar nos retries
      const goal                  = form.goal || "";
      const trainingAvailableDays = form.trainingAvailableDays || "";
      const trainingExperience    = form.trainingExperience || "";
      const trainingAge           = form.trainingAge || "";
      const availableMinutes      = form.availableMinutes || "";
      const trainingPreference    = form.trainingPreference || "";
      setSavedGoal(goal);
      setSavedTrainingDays(trainingAvailableDays);
      setSavedTrainingExp(trainingExperience);
      setSavedTrainingAge(trainingAge);
      setSavedAvailableMinutes(availableMinutes);
      setSavedTrainingPreference(trainingPreference);
      setSavedFavoriteExercises(form.favoriteExercises || "");
      setSavedWorkoutDayProtocol(form.workoutDayProtocol || "");

      // 4 — Exibe tela de geração imediatamente
      setWorkoutStatus("generating");
      setDietStatus("generating");
      setWorkoutError(null);
      setDietError(null);
      setShowGen(true);
      setSaving(false);

      // 5 — Gera treino e dieta em paralelo
      function withTimeout(promise, ms = 90_000) {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tempo limite excedido.")), ms)
          ),
        ]);
      }

      await Promise.allSettled([
        withTimeout(generateWorkoutWithAi({
          persist: true, goal, trainingAvailableDays, trainingExperience, trainingAge, availableMinutes, trainingPreference,
          trainingPreferenceFreeText: form.trainingPreferenceFreeText || "",
          muscleGroupCombinations: form.muscleGroupCombinations || "",
          workoutDayProtocol: form.workoutDayProtocol || "",
          favoriteExercises: form.favoriteExercises || "",
          trainingFocus: form.trainingFocus || "",
          dietApproach: form.dietApproach || "",
        }))
          .then(() => setWorkoutStatus("ok"))
          .catch(err => { setWorkoutStatus("error"); setWorkoutError(err?.message || "Erro desconhecido."); }),

        withTimeout(generateDietWithAi({ persist: true, goal, dietApproach: form.dietApproach || "", trainingFocus: form.trainingFocus || "" }))
          .then(() => setDietStatus("ok"))
          .catch(err => { setDietStatus("error"); setDietError(err?.message || "Erro desconhecido."); }),
      ]);

    } catch {
      // Erro inesperado no save — mostra tela de geração com erros
      setWorkoutStatus("error");
      setDietStatus("error");
      setShowGen(true);
      setSaving(false);
    }
  }

  // ── Retry handlers ────────────────────────────────────────────────────────
  async function handleRetryWorkout() {
    setWorkoutStatus("generating");
    setWorkoutError(null);
    try {
      await generateWorkoutWithAi({
        persist: true,
        goal: savedGoal,
        trainingAvailableDays: savedTrainingDays,
        trainingExperience: savedTrainingExp,
        trainingAge: savedTrainingAge,
        availableMinutes: savedAvailableMinutes,
        trainingPreference: savedTrainingPreference,
        favoriteExercises: savedFavoriteExercises,
        workoutDayProtocol: savedWorkoutDayProtocol,
      });
      setWorkoutStatus("ok");
    } catch (err) {
      setWorkoutStatus("error");
      setWorkoutError(err?.message || "Erro desconhecido.");
    }
  }

  async function handleRetryDiet() {
    setDietStatus("generating");
    setDietError(null);
    try {
      await generateDietWithAi({ persist: true, goal: savedGoal, dietApproach: form.dietApproach || "", trainingFocus: form.trainingFocus || "" });
      setDietStatus("ok");
    } catch (err) {
      setDietStatus("error");
      setDietError(err?.message || "Erro desconhecido.");
    }
  }

  // ── Render: Tela de geração ───────────────────────────────────────────────
  if (showGen) {
    return (
      <AiGeneratingScreen
        workoutStatus={workoutStatus}
        dietStatus={dietStatus}
        workoutError={workoutError}
        dietError={dietError}
        onRetryWorkout={handleRetryWorkout}
        onRetryDiet={handleRetryDiet}
        onComplete={onComplete}
        completeLabel="Entrar no Shape Certo →"
      />
    );
  }

  // ── Render: campos ───────────────────────────────────────────────────────
  function renderField(key) {
    const def = FIELD_DEFS[key];
    if (!def) return null;

    if (key === "trainingAvailableDays") {
      const selected = (form[key] || "").split(",").filter(Boolean);
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <div className="ob-daypicker">
            {WEEK_DAYS.map(d => (
              <button key={d.id} type="button"
                className={`ob-daypicker__btn${selected.includes(d.id) ? " is-active" : ""}`}
                onClick={() => {
                  const next = selected.includes(d.id)
                    ? selected.filter(x => x !== d.id)
                    : [...selected, d.id].sort((a,b) =>
                        WEEK_DAYS.findIndex(w=>w.id===a) - WEEK_DAYS.findIndex(w=>w.id===b));
                  handleChange(key, next.join(","));
                }}>
                {d.short}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (def.type === "traininglevel") {
      const selected = form[key] || "";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          <div className="ob-traininglevel">
            {TRAINING_LEVEL_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`ob-traininglevel__btn${selected === opt.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, opt.id)}
              >
                <span className="ob-traininglevel__badge">{opt.badge}</span>
                <span className="ob-traininglevel__info">
                  <span className="ob-traininglevel__label">{opt.label}</span>
                  <span className={`ob-traininglevel__sublabel ob-traininglevel__sublabel--${TRAINING_LEVEL_MAP[opt.id]?.experience || "iniciante"}`}>
                    {opt.sublabel}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <p className="ob-field__hint ob-traininglevel__hint">
              {TRAINING_LEVEL_OPTIONS.find(o => o.id === selected)?.hint}
            </p>
          )}
        </div>
      );
    }
    if (def.type === "trainingfrequency") {
      // Só aparece se a pessoa selecionou um tempo de treino (e não "nunca treinei")
      const levelSelected = form.trainingLevel;
      if (!levelSelected || levelSelected === "nunca") return null;
      const selected = form[key] || "";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <div className="ob-traininglevel ob-traininglevel--freq">
            {TRAINING_FREQUENCY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`ob-traininglevel__btn${selected === opt.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, opt.id)}
              >
                <span className="ob-traininglevel__badge">{opt.badge}</span>
                <span className="ob-traininglevel__info">
                  <span className="ob-traininglevel__label">{opt.label}</span>
                </span>
              </button>
            ))}
          </div>
          {selected && form.trainingExperience && (
            <p className="ob-field__hint ob-traininglevel__hint">
              {TRAINING_FREQUENCY_OPTIONS.find(o => o.id === selected)?.hint}
              {" — "}
              <strong style={{ color: "var(--brand)" }}>
                {form.trainingExperience === "iniciante"
                  ? "Seu nível: Iniciante"
                  : form.trainingExperience === "intermediario"
                  ? "Seu nível: Intermediário"
                  : "Seu nível: Avançado"}
              </strong>
            </p>
          )}
        </div>
      );
    }
    if (def.type === "bodygoal") {
      const options  = getBodyGoalOptions(form.goal || "");
      const selected = form[key] || "";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}<span className="ob-field__optional">Opcional</span>
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <div className="ob-protocol-picker ob-protocol-picker--bodygoal">
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`ob-protocol-picker__btn${selected === opt.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, opt.id)}
              >
                <span className="ob-protocol-picker__badge">{opt.badge}</span>
                <div className="ob-protocol-picker__info">
                  <span className="ob-protocol-picker__label">{opt.label}</span>
                  <span className="ob-protocol-picker__tagline">{opt.tagline}</span>
                  <span className="ob-protocol-picker__desc">{opt.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (def.type === "dietapproach") {
      const options  = getDietApproachOptions(form.goal || "");
      const selected = form[key] || "";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}<span className="ob-field__optional">Opcional</span>
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          {!form.goal && (
            <p className="ob-field__hint ob-field__hint--warn">Selecione seu objetivo na primeira etapa para ver as opções disponíveis.</p>
          )}
          <div className="ob-protocol-picker">
            {options.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`ob-protocol-picker__btn${selected === opt.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, opt.id)}
              >
                <span className="ob-protocol-picker__badge">{opt.badge}</span>
                <div className="ob-protocol-picker__info">
                  <span className="ob-protocol-picker__label">{opt.label}</span>
                  <span className="ob-protocol-picker__tagline">{opt.tagline}</span>
                  <span className="ob-protocol-picker__desc">{opt.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (def.type === "trainingfocus") {
      const selected = form[key] || "";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}<span className="ob-field__optional">Opcional</span>
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <div className="ob-protocol-picker ob-protocol-picker--focus">
            {TRAINING_FOCUS_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`ob-protocol-picker__btn${selected === opt.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, opt.id)}
              >
                <span className="ob-protocol-picker__badge">{opt.badge}</span>
                <div className="ob-protocol-picker__info">
                  <span className="ob-protocol-picker__label">{opt.label}</span>
                  <span className="ob-protocol-picker__tagline">{opt.tagline}</span>
                  <span className="ob-protocol-picker__desc">{opt.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (def.type === "profilesummary") {
      const s = buildProfileSummary(form);
      return (
        <div key={key} className="ob-profile-summary">
          <div className="ob-profile-summary__card ob-profile-summary__card--training">
            <div className="ob-profile-summary__card-header">
              <span className="ob-profile-summary__icon">
                {s.trainingOpt?.badge || "🏋️"}
              </span>
              <div>
                <p className="ob-profile-summary__card-label">Protocolo de treino</p>
                <h3 className="ob-profile-summary__card-title">
                  {s.trainingOpt?.label || "Personalizado"}
                  {" — "}
                  <span className={`ob-profile-summary__level ob-profile-summary__level--${form.trainingExperience || "iniciante"}`}>
                    {s.levelLabel}
                  </span>
                </h3>
              </div>
            </div>
            {s.trainingOpt && (
              <>
                <p className="ob-profile-summary__tagline">{s.trainingOpt.tagline}</p>
                <p className="ob-profile-summary__desc">{s.trainingOpt.description}</p>
              </>
            )}
            {!s.trainingOpt && (
              <p className="ob-profile-summary__desc ob-profile-summary__desc--empty">
                A IA vai escolher o foco ideal com base no seu objetivo e experiência.
              </p>
            )}
          </div>

          <div className="ob-profile-summary__card ob-profile-summary__card--diet">
            <div className="ob-profile-summary__card-header">
              <span className="ob-profile-summary__icon">
                {s.dietOpt?.badge || "🥗"}
              </span>
              <div>
                <p className="ob-profile-summary__card-label">Estratégia alimentar — definida pelo seu perfil</p>
                <h3 className="ob-profile-summary__card-title">
                  {s.dietOpt?.label || "Personalizado pelo objetivo"}
                </h3>
              </div>
            </div>
            {s.dietOpt && (
              <>
                <p className="ob-profile-summary__tagline">{s.dietOpt.tagline}</p>
                <p className="ob-profile-summary__desc">{s.dietOpt.description}</p>
              </>
            )}
            {!s.dietOpt && (
              <p className="ob-profile-summary__desc ob-profile-summary__desc--empty">
                A IA vai definir calorias e macros com base no seu objetivo, composição corporal e preferências alimentares.
              </p>
            )}
          </div>

          <div className="ob-profile-summary__meta">
            <div className="ob-profile-summary__meta-item">
              <span>📅</span>
              <span>
                {s.trainingDaysCount > 0
                  ? `${s.trainingDaysCount} dia${s.trainingDaysCount > 1 ? "s" : ""} de treino por semana`
                  : "Dias de treino a definir"}
              </span>
            </div>
            <div className="ob-profile-summary__meta-item">
              <span>🎯</span>
              <span>Objetivo: {s.goalLabel}</span>
            </div>
            <div className="ob-profile-summary__meta-item">
              <span>📊</span>
              <span>Nível: {s.levelLabel}</span>
            </div>
          </div>

          <div className="ob-profile-summary__ai-note">
            <span className="ob-profile-summary__ai-icon">✨</span>
            <p>
              Com esses dados, o Personal Virtual vai montar um{" "}
              <strong>protocolo de treino semanalizado</strong> e um{" "}
              <strong>plano alimentar com macros calculados</strong> — tudo personalizado
              para o seu objetivo, experiência e rotina.
            </p>
          </div>
        </div>
      );
    }
    if (def.type === "select") {
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}{def.required && <span className="ob-field__req">*</span>}
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <select className="ob-field__control" value={form[key] ?? ""} onChange={e => handleChange(key, e.target.value)}>
            {def.options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      );
    }
    if (def.type === "textarea") {
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}
            {def.required
              ? <span className="ob-field__req">*</span>
              : <span className="ob-field__optional">Opcional</span>}
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <textarea className="ob-field__control" rows={3} placeholder={def.placeholder ?? ""}
            value={form[key] ?? ""} onChange={e => handleChange(key, e.target.value)} />
        </div>
      );
    }
    if (def.type === "dayprotocol") {
      const split = form.trainingPreference || "";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}
            <span className="ob-field__optional">Opcional</span>
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <WorkoutDayProtocolBuilder
            value={form[key] || ""}
            onChange={v => handleChange(key, v)}
            trainingPreference={split}
            sex={form.sex || ""}
          />
        </div>
      );
    }
    if (def.type === "musclegroupicker") {
      const sex = form.sex || "";
      const combos = sex === "feminino" ? MUSCLE_COMBOS_FEM : MUSCLE_COMBOS_MASC;
      const selected = (form[key] || "").split(",").filter(Boolean);
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}
            {!def.required && <span className="ob-field__optional">Opcional</span>}
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          {sex === "feminino" && (
            <p className="ob-field__hint ob-field__hint--gender">👩 Opções voltadas para treino feminino</p>
          )}
          {sex === "masculino" && (
            <p className="ob-field__hint ob-field__hint--gender">💪 Opções voltadas para treino masculino</p>
          )}
          <div className="ob-combo-picker">
            {combos.map(c => (
              <button key={c.id} type="button"
                className={`ob-combo-picker__btn${selected.includes(c.id) ? " is-active" : ""}`}
                onClick={() => {
                  const next = selected.includes(c.id)
                    ? selected.filter(x => x !== c.id)
                    : [...selected, c.id];
                  handleChange(key, next.join(","));
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (def.type === "avatarpicker") {
      const selected = form[key] || "default-personal";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          <div className="ob-avatar-picker">
            {personalAvatarCatalog.map(avatar => (
              <button key={avatar.id} type="button"
                className={`ob-avatar-picker__item${selected === avatar.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, avatar.id)}
                title={avatar.label}
                aria-label={`Selecionar avatar ${avatar.label}`}
                aria-pressed={selected === avatar.id}
              >
                <img src={avatar.url} alt={avatar.label} className="ob-avatar-picker__img" />
              </button>
            ))}
          </div>
        </div>
      );
    }
    // text
    return (
      <div key={key} className="ob-field">
        <label className="ob-field__label">
          {def.label}{def.required && <span className="ob-field__req">*</span>}
        </label>
        {def.hint && <p className="ob-field__hint">{def.hint}</p>}
        <input className="ob-field__control" type="text"
          placeholder={def.placeholder ?? ""} value={form[key] ?? ""}
          onChange={e => handleChange(key, e.target.value)} />
      </div>
    );
  }

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true" aria-labelledby="ob-modal-title">
      <div className="ob-modal glass-panel">
        {/* Header */}
        <div className="ob-modal__header">
          <div className="ob-modal__eyebrow">Check-in inicial · Passo {step + 1} de {steps.length}</div>
          <h2 id="ob-modal-title" className="ob-modal__title">{currentStep.title}</h2>
          <p className="ob-modal__subtitle">{currentStep.subtitle}</p>
          <div className="ob-progress">
            <div className="ob-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Fields */}
        <div className="ob-modal__body">
          {currentStep.note && (
            <div className="ob-step-note">
              <span className="ob-step-note__icon">{currentStep.note.icon}</span>
              <p className="ob-step-note__text">{currentStep.note.text}</p>
            </div>
          )}
          {currentStep.fields.map(f => renderField(f))}
        </div>

        {/* Footer */}
        <div className="ob-modal__footer">
          {step > 0 && (
            <button type="button" className="ghost-button" onClick={() => setStep(s => s - 1)}>
              ← Voltar
            </button>
          )}
          {currentStep.optional && !isLast && (
            <button type="button" className="ghost-button ob-modal__skip" onClick={() => setStep(s => s + 1)}>
              Pular etapa
            </button>
          )}
          {currentStep.optional && isLast && (
            <button type="button" className="ghost-button ob-modal__skip" onClick={handleFinish} disabled={saving}>
              Pular etapa
            </button>
          )}
          {isLast ? (
            <button type="button" className="primary-button" onClick={handleFinish} disabled={saving}>
              {saving ? "Salvando..." : "Concluir e entrar →"}
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance}>
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
