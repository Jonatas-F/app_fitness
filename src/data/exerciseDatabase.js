/**
 * exerciseDatabase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Base de exercícios consultada pelo backend para construir prompts de treino
 * com menos tokens. Cada exercício tem: id, nome, equipamento, grupos musculares
 * primários/secundários, dificuldade e recomendação de séries/reps para iniciantes.
 *
 * Estrutura pensada para ser editável e consultável via SQL (o backend pode
 * seeds essa tabela a partir deste arquivo na inicialização).
 *
 * Equipamento: machine | cable | barbell | dumbbell | bodyweight | Smith
 */

// ── Grupos musculares ────────────────────────────────────────────────────────
export const MUSCLE_GROUPS = [
  { id: "peito",           label: "Peito",                 region: "superior" },
  { id: "costas",          label: "Costas",                region: "superior" },
  { id: "ombros",          label: "Ombros (Deltóides)",    region: "superior" },
  { id: "biceps",          label: "Bíceps",                region: "superior" },
  { id: "triceps",         label: "Tríceps",               region: "superior" },
  { id: "trapezio",        label: "Trapézio",              region: "superior" },
  { id: "quadriceps",      label: "Quadríceps",            region: "inferior" },
  { id: "isquiotibiais",   label: "Isquiotibiais",         region: "inferior" },
  { id: "gluteos",         label: "Glúteos",               region: "inferior" },
  { id: "panturrilha",     label: "Panturrilha",           region: "inferior" },
  { id: "adutores",        label: "Adutores",              region: "inferior" },
  { id: "abdomen",         label: "Abdômen / Core",        region: "core"     },
  { id: "lombar",          label: "Lombar",                region: "core"     },
  { id: "manguito",        label: "Manguito Rotador",      region: "superior" },
];

// ── Exercícios ───────────────────────────────────────────────────────────────
// Organizado por grupo muscular principal para fácil query.
// beginner: { sets: [min, max], reps: [min, max], rest_s: segundos }

export const EXERCISE_DATABASE = [

  // ════════════════════════════════════════════════════════════════════════════
  // PEITO
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "supino-maquina",
    name: "Supino na Máquina (Chest Press)",
    equipment: "machine",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["deltoid_anterior", "triceps"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 90 },
    tip: "Ajuste o encosto para que os cotovelos fiquem alinhados com o peito. Exercício âncora para retomada.",
  },
  {
    id: "supino-inclinado-maquina",
    name: "Supino Inclinado na Máquina",
    equipment: "machine",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["deltoid_anterior", "triceps"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 90 },
    tip: "Ativa principalmente a porção superior do peitoral clavicular.",
  },
  {
    id: "peck-deck",
    name: "Peck Deck / Fly Máquina",
    equipment: "machine",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["deltoid_anterior"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [10, 15], rest_s: 60 },
    tip: "Squeeze no fechamento — segure 1 segundo para máxima contração do peitoral.",
  },
  {
    id: "crossover-cabo",
    name: "Crossover no Cabo (polia alta → baixo)",
    equipment: "cable",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["deltoid_anterior"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [12, 15], rest_s: 60 },
    tip: "Porção inferior do peitoral — foco na contração final com tensão constante no cabo.",
  },
  {
    id: "supino-declinado-maquina",
    name: "Supino Declinado na Máquina",
    equipment: "machine",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["triceps"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [10, 12], rest_s: 90 },
    tip: "Fecha o peitoral inferior — complementa o supino plano.",
  },
  {
    id: "supino-reto-barra",
    name: "Supino Reto com Barra",
    equipment: "barbell",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["deltoid_anterior", "triceps"] },
    difficulty: "intermediate",
    beginner: { sets: [3, 4], reps: [6, 10], rest_s: 120 },
    tip: "Peito para intermediários. Requer spotter ou gaiola de segurança.",
  },
  {
    id: "supino-halteres",
    name: "Supino Reto com Halteres",
    equipment: "dumbbell",
    group: "peito",
    muscles: { primary: ["peito"], secondary: ["deltoid_anterior", "triceps"] },
    difficulty: "intermediate",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 90 },
    tip: "Maior amplitude de movimento que a barra. Bom para correção de assimetrias.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // COSTAS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "puxada-frontal-pulley",
    name: "Puxada Frontal no Pulley (barra larga)",
    equipment: "cable",
    group: "costas",
    muscles: { primary: ["costas"], secondary: ["biceps", "manguito"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 90 },
    tip: "Peito no encosto, cotovelo puxando para baixo. Não travar o pulso.",
  },
  {
    id: "remada-maquina",
    name: "Remada na Máquina (Chest Supported Row)",
    equipment: "machine",
    group: "costas",
    muscles: { primary: ["costas"], secondary: ["biceps", "trapezio"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 90 },
    tip: "Peito apoiado elimina o impulso da lombar — ideal para iniciantes.",
  },
  {
    id: "remada-cabo-triangulo",
    name: "Remada Sentado no Cabo (triângulo)",
    equipment: "cable",
    group: "costas",
    muscles: { primary: ["costas"], secondary: ["biceps", "trapezio"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [10, 12], rest_s: 90 },
    tip: "Retração escapular completa no final do movimento.",
  },
  {
    id: "puxada-fechada-supinada",
    name: "Puxada Fechada (pega supinada)",
    equipment: "cable",
    group: "costas",
    muscles: { primary: ["costas", "biceps"], secondary: ["trapezio"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [10, 12], rest_s: 90 },
    tip: "Bíceps + latíssimo — trabalha espessura e largura das costas.",
  },
  {
    id: "remada-baixa-barra",
    name: "Remada Baixa com Barra",
    equipment: "barbell",
    group: "costas",
    muscles: { primary: ["costas"], secondary: ["biceps", "lombar"] },
    difficulty: "intermediate",
    beginner: { sets: [3, 4], reps: [8, 10], rest_s: 120 },
    tip: "Joelho semiflexionado, lombar neutra. Evitar em casos de lombalgia.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // OMBROS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "desenvolvimento-maquina",
    name: "Desenvolvimento na Máquina (Shoulder Press)",
    equipment: "machine",
    group: "ombros",
    muscles: { primary: ["ombros"], secondary: ["triceps", "trapezio"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 90 },
    tip: "Deltóide anterior e medial. Ajuste o assento para que as alças fiquem na altura dos ombros.",
  },
  {
    id: "elevacao-lateral-cabo",
    name: "Elevação Lateral no Cabo (polia baixa)",
    equipment: "cable",
    group: "ombros",
    muscles: { primary: ["ombros"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [12, 15], rest_s: 60 },
    tip: "Tensão constante no deltóide medial. Superior ao halter para iniciantes.",
  },
  {
    id: "elevacao-frontal-cabo",
    name: "Elevação Frontal no Cabo",
    equipment: "cable",
    group: "ombros",
    muscles: { primary: ["ombros"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [12, 15], rest_s: 60 },
    tip: "Deltóide anterior. Não ultrapassar a linha dos ombros no topo.",
  },
  {
    id: "voador-invertido-maquina",
    name: "Voador Invertido (Peck Deck Inverso)",
    equipment: "machine",
    group: "ombros",
    muscles: { primary: ["ombros"], secondary: ["trapezio", "manguito"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [12, 15], rest_s: 60 },
    tip: "Deltóide posterior — corrige postura. Manter os cotovelos ligeiramente flexionados.",
  },
  {
    id: "face-pull-cabo",
    name: "Face Pull no Cabo (corda)",
    equipment: "cable",
    group: "ombros",
    muscles: { primary: ["ombros", "manguito"], secondary: ["trapezio"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [15, 20], rest_s: 45 },
    tip: "Saúde do manguito rotador — nunca pular este exercício. Puxar até o nível dos olhos.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TRAPÉZIO
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "encolhimento-maquina",
    name: "Encolhimento na Máquina",
    equipment: "machine",
    group: "trapezio",
    muscles: { primary: ["trapezio"], secondary: ["ombros"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [12, 15], rest_s: 60 },
    tip: "Sem girar os ombros — movimento puro de elevação vertical.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BÍCEPS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "rosca-cabo-barra-reta",
    name: "Rosca no Cabo (barra reta, polia baixa)",
    equipment: "cable",
    group: "biceps",
    muscles: { primary: ["biceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [10, 12], rest_s: 75 },
    tip: "Tensão constante. Mais seguro na retomada após pausa.",
  },
  {
    id: "rosca-scott-maquina",
    name: "Rosca Scott na Máquina",
    equipment: "machine",
    group: "biceps",
    muscles: { primary: ["biceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [10, 12], rest_s: 60 },
    tip: "Isolamento total — pico do bíceps. Apoio do braço elimina compensação.",
  },
  {
    id: "rosca-martelo-cabo",
    name: "Rosca Martelo no Cabo (corda)",
    equipment: "cable",
    group: "biceps",
    muscles: { primary: ["biceps"], secondary: ["braquial", "braquiorradial"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [12, 15], rest_s: 60 },
    tip: "Braquial + braquiorradial — espessura do braço.",
  },
  {
    id: "rosca-direta-barra",
    name: "Rosca Direta com Barra",
    equipment: "barbell",
    group: "biceps",
    muscles: { primary: ["biceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 75 },
    tip: "Clássico isolamento de bíceps. Não balançar o corpo.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // TRÍCEPS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "triceps-polia-corda",
    name: "Tríceps Polia Corda (polia alta)",
    equipment: "cable",
    group: "triceps",
    muscles: { primary: ["triceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [10, 15], rest_s: 75 },
    tip: "Abrir as mãos no final para contração máxima das 3 cabeças.",
  },
  {
    id: "triceps-maquina",
    name: "Tríceps na Máquina (Overhead / Pushdown)",
    equipment: "machine",
    group: "triceps",
    muscles: { primary: ["triceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [10, 12], rest_s: 60 },
    tip: "Cabeça longa — braços acima da cabeça se possível para máxima ativação.",
  },
  {
    id: "triceps-reverso-cabo",
    name: "Tríceps Reverso no Cabo (pega supinada)",
    equipment: "cable",
    group: "triceps",
    muscles: { primary: ["triceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [12, 15], rest_s: 45 },
    tip: "Finalizador de pump. Ativa diferente cabeça do tríceps.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // QUADRÍCEPS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "leg-press-45",
    name: "Leg Press 45° (pés médios — ênfase quadríceps)",
    equipment: "machine",
    group: "quadriceps",
    muscles: { primary: ["quadriceps"], secondary: ["gluteos"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [8, 12], rest_s: 120 },
    tip: "Joelhos alinhados com os dedos, profundidade paralela. Não travar o joelho no topo.",
  },
  {
    id: "cadeira-extensora",
    name: "Cadeira Extensora",
    equipment: "machine",
    group: "quadriceps",
    muscles: { primary: ["quadriceps"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [12, 15], rest_s: 75 },
    tip: "Isolamento total do quadríceps. Segure 1s no topo para contração isométrica.",
  },
  {
    id: "hack-squat-maquina",
    name: "Hack Squat na Máquina",
    equipment: "machine",
    group: "quadriceps",
    muscles: { primary: ["quadriceps"], secondary: ["gluteos"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [10, 12], rest_s: 120 },
    tip: "Profundidade paralela. Ativa o vasto medial (músculo interno da coxa).",
  },
  {
    id: "leg-press-unilateral",
    name: "Leg Press Unilateral",
    equipment: "machine",
    group: "quadriceps",
    muscles: { primary: ["quadriceps"], secondary: ["gluteos"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [12, 15], rest_s: 90 },
    tip: "Corrige assimetria de força entre as pernas.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // POSTERIOR DE COXA / ISQUIOTIBIAIS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "mesa-flexora",
    name: "Mesa Flexora (Leg Curl deitado)",
    equipment: "machine",
    group: "isquiotibiais",
    muscles: { primary: ["isquiotibiais"], secondary: ["panturrilha"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [10, 12], rest_s: 90 },
    tip: "Âncora para isquiotibiais. Sem impulso — movimento lento e controlado.",
  },
  {
    id: "leg-curl-pe-unilateral",
    name: "Leg Curl em Pé (unilateral)",
    equipment: "machine",
    group: "isquiotibiais",
    muscles: { primary: ["isquiotibiais"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [12, 15], rest_s: 60 },
    tip: "Correção de assimetrias. Trabalha unilateralmente.",
  },
  {
    id: "leg-press-pes-altos",
    name: "Leg Press 45° (pés altos — ênfase posterior)",
    equipment: "machine",
    group: "isquiotibiais",
    muscles: { primary: ["isquiotibiais", "gluteos"], secondary: ["quadriceps"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [10, 12], rest_s: 120 },
    tip: "Pés altos na plataforma ativa mais glúteo e isquiotibiais.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // GLÚTEOS
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "gluteo-cabo-kickback",
    name: "Glúteo no Cabo / Máquina de Glúteo (Kickback)",
    equipment: "cable",
    group: "gluteos",
    muscles: { primary: ["gluteos"], secondary: ["isquiotibiais"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [15, 20], rest_s: 60 },
    tip: "Extensão total do quadril. Realizar por lado para melhor isolamento.",
  },
  {
    id: "abducao-quadril-maquina",
    name: "Abdução de Quadril na Máquina",
    equipment: "machine",
    group: "gluteos",
    muscles: { primary: ["gluteos"], secondary: ["adutores"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [15, 20], rest_s: 60 },
    tip: "Glúteo médio — estabilizador do joelho. Importante para saúde articular.",
  },
  {
    id: "hip-thrust-maquina",
    name: "Hip Thrust na Máquina",
    equipment: "machine",
    group: "gluteos",
    muscles: { primary: ["gluteos"], secondary: ["isquiotibiais"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [10, 15], rest_s: 90 },
    tip: "Principal exercício para glúteo. Extensão completa do quadril no topo.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ADUTORES
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "adutor-maquina",
    name: "Adutor na Máquina",
    equipment: "machine",
    group: "adutores",
    muscles: { primary: ["adutores"], secondary: ["gluteos"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [15, 20], rest_s: 60 },
    tip: "Interno da coxa — movimento lento e controlado. Não usar impulso.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // PANTURRILHA
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "panturrilha-em-pe-maquina",
    name: "Panturrilha em Pé na Máquina (Gastrocnêmio)",
    equipment: "machine",
    group: "panturrilha",
    muscles: { primary: ["panturrilha"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [15, 20], rest_s: 45 },
    tip: "2s no topo, amplitude completa. Gastrocnêmio trabalha com joelho estendido.",
  },
  {
    id: "panturrilha-sentado-soleo",
    name: "Panturrilha Sentado — Sóleo",
    equipment: "machine",
    group: "panturrilha",
    muscles: { primary: ["panturrilha"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [15, 20], rest_s: 45 },
    tip: "Sóleo trabalha com joelho flexionado. Complementa a panturrilha em pé.",
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ABDÔMEN / CORE
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: "abdominal-maquina-crunch",
    name: "Abdominal na Máquina (Crunch)",
    equipment: "machine",
    group: "abdomen",
    muscles: { primary: ["abdomen"], secondary: ["lombar"] },
    difficulty: "beginner",
    beginner: { sets: [3, 4], reps: [15, 20], rest_s: 45 },
    tip: "Movimento controlado — não usar impulso do pescoço.",
  },
  {
    id: "prancha-isometrica",
    name: "Prancha Isométrica",
    equipment: "bodyweight",
    group: "abdomen",
    muscles: { primary: ["abdomen", "lombar"], secondary: ["ombros"] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [30, 60], rest_s: 45 }, // reps = segundos
    tip: "Reps em segundos de isometria. Corpo alinhado da cabeça ao calcanhar.",
  },
  {
    id: "abdominal-cabo",
    name: "Abdominal no Cabo (Kneeling Cable Crunch)",
    equipment: "cable",
    group: "abdomen",
    muscles: { primary: ["abdomen"], secondary: [] },
    difficulty: "beginner",
    beginner: { sets: [3], reps: [12, 15], rest_s: 45 },
    tip: "Tensão constante no abdômen — mais efetivo que crunch no chão.",
  },

];

// ── Helpers para query ────────────────────────────────────────────────────────

/** Retorna todos os exercícios de um grupo muscular */
export function getExercisesByGroup(groupId) {
  return EXERCISE_DATABASE.filter(ex => ex.group === groupId);
}

/** Retorna exercícios por equipamento */
export function getExercisesByEquipment(equipment) {
  return EXERCISE_DATABASE.filter(ex => ex.equipment === equipment);
}

/** Retorna exercícios para um conjunto de grupos musculares (string "peito,costas" ou array) */
export function getExercisesForMuscles(muscles) {
  const ids = Array.isArray(muscles) ? muscles : muscles.split(",").map(s => s.trim());
  return EXERCISE_DATABASE.filter(ex => ids.includes(ex.group));
}

/** Gera descrição compacta para incluir no contexto da IA (economiza tokens) */
export function formatExercisesForPrompt(exercises) {
  return exercises
    .map(ex => {
      const s = ex.beginner;
      return `• ${ex.name} [${ex.equipment}] — ${s.sets[0]}–${s.sets[1] ?? s.sets[0]}x${s.reps[0]}-${s.reps[1]} / descanso ${s.rest_s}s`;
    })
    .join("\n");
}

/** Mapa grupo → exercícios (para construção de prompts por divisão) */
export const EXERCISES_BY_GROUP = MUSCLE_GROUPS.reduce((acc, g) => {
  acc[g.id] = getExercisesByGroup(g.id);
  return acc;
}, {});

export default EXERCISE_DATABASE;
