import { loadTrainingProtocol } from "./trainingStorage";
import { loadDietProtocol } from "./dietStorage";

const CHECKINS_STORAGE_KEY = "shapeCertoCheckins";

export const checkinCadences = {
  daily: {
    label: "Sessao de treino",
    description: "Registro automatico criado ao finalizar uma sessao de treino.",
  },
  weekly: {
    label: "Semanal",
    description: "Fechamento da semana para ajustar dieta ou treino quando fizer sentido.",
  },
  monthly: {
    label: "Mensal",
    description: "Reavaliacao completa com objetivo, medidas e bioimpedancia.",
  },
};

export const defaultCheckinForm = {
  cadence: "weekly",
  goal: "hipertrofia",
  sport: "",
  sex: "",
  age: "",
  weight: "",
  height: "",
  totalBodyWeight: "",
  bodyFat: "",
  bioimpedanceBodyFat: "",
  leanMass: "",
  fatMass: "",
  muscleMass: "",
  skeletalMuscleMass: "",
  totalBodyWater: "",
  boneMass: "",
  basalMetabolicRate: "",
  rightArmMuscleMass: "",
  leftArmMuscleMass: "",
  rightLegMuscleMass: "",
  leftLegMuscleMass: "",
  trunkMuscleMass: "",
  rightArmFat: "",
  leftArmFat: "",
  rightLegFat: "",
  leftLegFat: "",
  trunkFat: "",
  rightArmMeasure: "",
  leftArmMeasure: "",
  rightFlexedArmMeasure: "",
  leftFlexedArmMeasure: "",
  rightThighMeasure: "",
  leftThighMeasure: "",
  rightCalfMeasure: "",
  leftCalfMeasure: "",
  chestMeasure: "",
  metabolicAge: "",
  visceralFat: "",
  bmi: "",
  waist: "",
  abdomen: "",
  hip: "",
  restingHeartRate: "",
  averageTrainingHeartRate: "",
  estimatedVo2: "",
  trainingExperience: "",
  trainingAge: "",
  trainingBackground: "",
  injuryTags: [],
  trainingBackgroundTags: [],
  weeklyTrainingDays: "",
  trainingAvailableDays: "",
  trainingShift: "",
  wakeTime: "",
  sleepTime: "",
  firstMealTime: "",
  lastMealTime: "",
  plannedTrainingTime: "",
  availableMinutes: "",
  injuries: "",
  dietaryRestrictions: "",
  foodPreferences: "",
  mealsPerDay: "",
  dietVariety: "media",
  energy: "8",
  sleep: "",
  adherence: "85",
  hunger: "",
  stress: "",
  digestion: "",
  sleepQuality: "",
  fatigueLevel: "",
  trainingPerformance: "",
  weeklyWorkoutsPlanned: "",
  weeklyWorkoutsCompleted: "",
  workoutAdherence: "",
  dietMealsPlanned: "",
  dietMealsCompleted: "",
  dietAdherence: "",
  protocolAction: "none",
  notes: "",
  photoNote: "",
  photos: [],
};

const requiredFieldsByCadence = {
  daily: [],
  weekly: [
    "height",
    "weight",
    "hunger",
    "stress",
    "digestion",
    "sleepQuality",
    "fatigueLevel",
    "trainingPerformance",
    "protocolAction",
    "notes",
  ],
  monthly: [
    "height",
    "weight",
    "hunger",
    "stress",
    "digestion",
    "sleepQuality",
    "fatigueLevel",
    "trainingPerformance",
    "protocolAction",
    "notes",
  ],
};

const checkinFieldLabels = {
  age: "idade",
  sex: "sexo",
  goal: "objetivo",
  weight: "peso",
  height: "altura",
  trainingExperience: "nivel de treino",
  weeklyTrainingDays: "frequencia semanal",
  availableMinutes: "tempo disponivel por treino",
  injuries: "lesoes ou limitacoes",
  trainingAge: "tempo de treino",
  trainingBackground: "experiencia previa com treino",
  energy: "energia",
  sleep: "sono",
  adherence: "aderencia",
  waist: "cintura",
  abdomen: "abdomen",
  hip: "quadril",
  chestMeasure: "peito",
  rightArmMeasure: "braco relaxado direito",
  leftArmMeasure: "braco relaxado esquerdo",
  rightFlexedArmMeasure: "braco contraido direito",
  leftFlexedArmMeasure: "braco contraido esquerdo",
  rightThighMeasure: "coxa direita",
  leftThighMeasure: "coxa esquerda",
  rightCalfMeasure: "panturrilha direita",
  leftCalfMeasure: "panturrilha esquerda",
  bodyFat: "gordura corporal estimada",
  leanMass: "massa magra estimada",
  hunger: "fome",
  stress: "estresse",
  digestion: "digestao",
  sleepQuality: "qualidade do sono",
  fatigueLevel: "nivel de fadiga",
  trainingPerformance: "performance no treino",
  dietVariety: "variacao da dieta",
  protocolAction: "acao sobre protocolo",
  notes: "feedback da semana",
  photos: "fotos de progresso",
};

const aiRelevantFields = [
  "goal",
  "sport",
  "sex",
  "age",
  "weight",
  "height",
  "totalBodyWeight",
  "bodyFat",
  "bioimpedanceBodyFat",
  "leanMass",
  "fatMass",
  "muscleMass",
  "skeletalMuscleMass",
  "totalBodyWater",
  "boneMass",
  "basalMetabolicRate",
  "rightArmMuscleMass",
  "leftArmMuscleMass",
  "rightLegMuscleMass",
  "leftLegMuscleMass",
  "trunkMuscleMass",
  "rightArmFat",
  "leftArmFat",
  "rightLegFat",
  "leftLegFat",
  "trunkFat",
  "rightArmMeasure",
  "leftArmMeasure",
  "rightFlexedArmMeasure",
  "leftFlexedArmMeasure",
  "rightThighMeasure",
  "leftThighMeasure",
  "rightCalfMeasure",
  "leftCalfMeasure",
  "chestMeasure",
  "metabolicAge",
  "visceralFat",
  "bmi",
  "waist",
  "abdomen",
  "hip",
  "restingHeartRate",
  "averageTrainingHeartRate",
  "estimatedVo2",
  "trainingExperience",
  "trainingAge",
  "trainingBackground",
  "injuryTags",
  "trainingBackgroundTags",
  "weeklyTrainingDays",
  "trainingAvailableDays",
  "trainingShift",
  "wakeTime",
  "sleepTime",
  "firstMealTime",
  "lastMealTime",
  "plannedTrainingTime",
  "availableMinutes",
  "injuries",
  "dietaryRestrictions",
  "foodPreferences",
  "mealsPerDay",
  "dietVariety",
  "energy",
  "sleep",
  "adherence",
  "hunger",
  "stress",
  "digestion",
  "sleepQuality",
  "fatigueLevel",
  "trainingPerformance",
  "weeklyWorkoutsPlanned",
  "weeklyWorkoutsCompleted",
  "workoutAdherence",
  "dietMealsPlanned",
  "dietMealsCompleted",
  "dietAdherence",
  "protocolAction",
  "notes",
  "photoNote",
  "photos",
];

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getTodayDate() {
  return new Date().toISOString();
}

function getCreatedAtFromOptions(options) {
  if (!options.createdAt) {
    return getTodayDate();
  }

  const date = new Date(options.createdAt);

  if (Number.isNaN(date.getTime())) {
    return getTodayDate();
  }

  return date.toISOString();
}

function getCheckinDateKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getTodayDate().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const injuryTagRules = [
  { tag: "joelho", terms: ["joelho", "patela", "menisco", "ligamento cruzado"] },
  { tag: "ombro", terms: ["ombro", "manguito", "supraespinhal"] },
  { tag: "lombar", terms: ["lombar", "coluna", "ciatico", "ciatica"] },
  { tag: "quadril", terms: ["quadril", "iliaco", "pubalgia"] },
  { tag: "tornozelo", terms: ["tornozelo", "tendao de aquiles", "aquiles"] },
  { tag: "punho", terms: ["punho", "mao", "carpo"] },
  { tag: "cotovelo", terms: ["cotovelo", "epicondilite"] },
  { tag: "cervical", terms: ["cervical", "pescoco"] },
];

const trainingBackgroundTagRules = [
  { tag: "musculacao", terms: ["musculacao", "academia", "hipertrofia"] },
  { tag: "crossfit", terms: ["crossfit", "cross"] },
  { tag: "corrida", terms: ["corrida", "run", "maratona", "10k", "5k"] },
  { tag: "lutas", terms: ["boxe", "muay", "jiu", "mma", "luta"] },
  { tag: "esporte-coletivo", terms: ["futebol", "volei", "basquete", "handebol"] },
  { tag: "iniciante", terms: ["iniciante", "nunca", "sedentario"] },
  { tag: "treino-em-casa", terms: ["casa", "calistenia", "funcional"] },
];

function extractTags(text, rules) {
  const normalized = normalizeText(text);
  return rules
    .filter((rule) => rule.terms.some((term) => normalized.includes(normalizeText(term))))
    .map((rule) => rule.tag);
}

function daysBetween(dateA, dateB) {
  const start = new Date(dateA);
  const end = new Date(dateB);
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function normalizeCadence(cadence) {
  return checkinCadences[cadence] ? cadence : "weekly";
}

function completedOnly(checkins) {
  return checkins.filter((item) => item.status !== "missed");
}

function average(entries, field) {
  const values = entries
    .map((item) => Number(String(item[field] ?? "").replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) {
    return "--";
  }

  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

export function validateCheckinForm(checkinData) {
  const cadence = normalizeCadence(checkinData.cadence);
  const missingFields = requiredFieldsByCadence[cadence].filter(
    (field) => !hasValue(checkinData[field])
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
    message: missingFields.length
      ? `Preencha os campos obrigatorios: ${missingFields
          .map((field) => checkinFieldLabels[field] || field)
          .join(", ")}.`
      : "",
  };
}

export function calculateCheckinCompleteness(checkinData) {
  const cadence = normalizeCadence(checkinData.cadence);
  const cadenceWeight = cadence === "daily" ? 12 : cadence === "weekly" ? 22 : 32;
  const fields = aiRelevantFields.slice(0, cadenceWeight);
  const completed = fields.filter((field) => hasValue(checkinData[field])).length;
  return Math.round((completed / fields.length) * 100);
}

function buildAiContext(checkinData, completeness, status) {
  const cadence = normalizeCadence(checkinData.cadence);

  return {
    cadence,
    status,
    readiness: status === "missed" ? "ausente" : completeness >= 75 ? "alta" : completeness >= 45 ? "media" : "basica",
    inferencePolicy:
      status === "missed"
        ? "Registro mantido como gap. Nao usar para media; apenas sinalizar ausencia."
        : "Usar apenas dados informados. Gaps diarios e semanais devem ser ignorados nas medias.",
    regenerationPolicy:
      checkinData.protocolAction === "request-adjustment"
        ? "Usuario sinalizou necessidade de ajuste. Avaliar treino e dieta antes de regenerar."
        : "Nao regenerar treino ou dieta automaticamente.",
    goal: checkinData.goal || "",
    requiredData: {
      age: checkinData.age || "",
      sex: checkinData.sex || "",
      weight: checkinData.weight || "",
      height: checkinData.height || "",
      energy: checkinData.energy || "",
      sleep: checkinData.sleep || "",
      adherence: checkinData.adherence || "",
    },
    anthropometry: {
      bodyFat: checkinData.bodyFat || "",
      leanMass: checkinData.leanMass || "",
      waist: checkinData.waist || "",
      abdomen: checkinData.abdomen || "",
      hip: checkinData.hip || "",
      chestMeasure: checkinData.chestMeasure || "",
      rightArmMeasure: checkinData.rightArmMeasure || "",
      leftArmMeasure: checkinData.leftArmMeasure || "",
      rightFlexedArmMeasure: checkinData.rightFlexedArmMeasure || "",
      leftFlexedArmMeasure: checkinData.leftFlexedArmMeasure || "",
      rightThighMeasure: checkinData.rightThighMeasure || "",
      leftThighMeasure: checkinData.leftThighMeasure || "",
      rightCalfMeasure: checkinData.rightCalfMeasure || "",
      leftCalfMeasure: checkinData.leftCalfMeasure || "",
    },
    bodyComposition: {
      totalBodyWeight: checkinData.totalBodyWeight || "",
      bodyFat: checkinData.bodyFat || "",
      bioimpedanceBodyFat: checkinData.bioimpedanceBodyFat || "",
      leanMass: checkinData.leanMass || "",
      fatMass: checkinData.fatMass || "",
      muscleMass: checkinData.muscleMass || "",
      skeletalMuscleMass: checkinData.skeletalMuscleMass || "",
      totalBodyWater: checkinData.totalBodyWater || "",
      boneMass: checkinData.boneMass || "",
      basalMetabolicRate: checkinData.basalMetabolicRate || "",
      rightArmMuscleMass: checkinData.rightArmMuscleMass || "",
      leftArmMuscleMass: checkinData.leftArmMuscleMass || "",
      rightLegMuscleMass: checkinData.rightLegMuscleMass || "",
      leftLegMuscleMass: checkinData.leftLegMuscleMass || "",
      trunkMuscleMass: checkinData.trunkMuscleMass || "",
      rightArmFat: checkinData.rightArmFat || "",
      leftArmFat: checkinData.leftArmFat || "",
      rightLegFat: checkinData.rightLegFat || "",
      leftLegFat: checkinData.leftLegFat || "",
      trunkFat: checkinData.trunkFat || "",
      rightArmMeasure: checkinData.rightArmMeasure || "",
      leftArmMeasure: checkinData.leftArmMeasure || "",
      rightThighMeasure: checkinData.rightThighMeasure || "",
      leftThighMeasure: checkinData.leftThighMeasure || "",
      metabolicAge: checkinData.metabolicAge || "",
      visceralFat: checkinData.visceralFat || "",
      bmi: checkinData.bmi || "",
    },
    trainingContext: {
      sport: checkinData.sport || "",
      experience: checkinData.trainingExperience || "",
      trainingAge: checkinData.trainingAge || "",
      trainingBackground: checkinData.trainingBackground || "",
      trainingBackgroundTags: Array.isArray(checkinData.trainingBackgroundTags)
        ? checkinData.trainingBackgroundTags
        : [],
      weeklyDays: checkinData.weeklyTrainingDays || "",
      shift: checkinData.trainingShift || "",
      plannedTrainingTime: checkinData.plannedTrainingTime || "",
      availableMinutes: checkinData.availableMinutes || "",
      injuries: checkinData.injuries || "",
      injuryTags: Array.isArray(checkinData.injuryTags) ? checkinData.injuryTags : [],
      restingHeartRate: checkinData.restingHeartRate || "",
      averageTrainingHeartRate: checkinData.averageTrainingHeartRate || "",
      estimatedVo2: checkinData.estimatedVo2 || "",
      performance: checkinData.trainingPerformance || "",
      weeklyWorkoutsPlanned: checkinData.weeklyWorkoutsPlanned || "",
      weeklyWorkoutsCompleted: checkinData.weeklyWorkoutsCompleted || "",
      workoutAdherence: checkinData.workoutAdherence || "",
    },
    nutritionContext: {
      dietaryRestrictions: checkinData.dietaryRestrictions || "",
      foodPreferences: checkinData.foodPreferences || "",
      mealsPerDay: checkinData.mealsPerDay || "",
      dietVariety: checkinData.dietVariety || "",
      wakeTime: checkinData.wakeTime || "",
      sleepTime: checkinData.sleepTime || "",
      firstMealTime: checkinData.firstMealTime || "",
      lastMealTime: checkinData.lastMealTime || "",
      dietMealsPlanned: checkinData.dietMealsPlanned || "",
      dietMealsCompleted: checkinData.dietMealsCompleted || "",
      dietAdherence: checkinData.dietAdherence || "",
      hunger: checkinData.hunger || "",
      digestion: checkinData.digestion || "",
    },
    subjectiveContext: {
      sex: checkinData.sex || "",
      age: checkinData.age || "",
      stress: checkinData.stress || "",
      sleepQuality: checkinData.sleepQuality || "",
      fatigueLevel: checkinData.fatigueLevel || "",
      notes: checkinData.notes || "",
      photoNote: checkinData.photoNote || "",
      photos: Array.isArray(checkinData.photos) ? checkinData.photos : [],
    },
  };
}

export function loadCheckins() {
  const raw = localStorage.getItem(CHECKINS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function persistCheckins(checkins) {
  const safeCheckins = Array.isArray(checkins) ? checkins : [];
  localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(safeCheckins));
  return safeCheckins;
}

export function saveCheckin(checkinData, options = {}) {
  const current = loadCheckins();
  const cadence = normalizeCadence(checkinData.cadence);
  const status = options.status || "completed";
  const createdAt = getCreatedAtFromOptions(options);
  const checkinDateKey = getCheckinDateKey(createdAt);
  const completeness =
    status === "missed" ? 0 : calculateCheckinCompleteness({ ...checkinData, cadence });
  const injuryTags = Array.from(new Set(extractTags(checkinData.injuries, injuryTagRules)));
  const trainingBackgroundTags = Array.from(
    new Set(extractTags(checkinData.trainingBackground, trainingBackgroundTagRules))
  );
  const normalizedCheckinData = {
    ...checkinData,
    injuryTags,
    trainingBackgroundTags,
  };

  const newCheckin = {
    id: `checkin-${cadence}-${checkinDateKey}-${Date.now()}`,
    cadence,
    status,
    goal: checkinData.goal || "",
    sport: checkinData.sport || "",
    sex: checkinData.sex || "",
    age: checkinData.age || "",
    weight: checkinData.weight || "",
    height: checkinData.height || "",
    totalBodyWeight: checkinData.totalBodyWeight || "",
    bodyFat: checkinData.bodyFat || "",
    bioimpedanceBodyFat: checkinData.bioimpedanceBodyFat || "",
    leanMass: checkinData.leanMass || "",
    fatMass: checkinData.fatMass || "",
    muscleMass: checkinData.muscleMass || "",
    skeletalMuscleMass: checkinData.skeletalMuscleMass || "",
    totalBodyWater: checkinData.totalBodyWater || "",
    boneMass: checkinData.boneMass || "",
    basalMetabolicRate: checkinData.basalMetabolicRate || "",
    rightArmMuscleMass: checkinData.rightArmMuscleMass || "",
    leftArmMuscleMass: checkinData.leftArmMuscleMass || "",
    rightLegMuscleMass: checkinData.rightLegMuscleMass || "",
    leftLegMuscleMass: checkinData.leftLegMuscleMass || "",
    trunkMuscleMass: checkinData.trunkMuscleMass || "",
    rightArmFat: checkinData.rightArmFat || "",
    leftArmFat: checkinData.leftArmFat || "",
    rightLegFat: checkinData.rightLegFat || "",
    leftLegFat: checkinData.leftLegFat || "",
    trunkFat: checkinData.trunkFat || "",
    rightArmMeasure: checkinData.rightArmMeasure || "",
    leftArmMeasure: checkinData.leftArmMeasure || "",
    rightFlexedArmMeasure: checkinData.rightFlexedArmMeasure || "",
    leftFlexedArmMeasure: checkinData.leftFlexedArmMeasure || "",
    rightThighMeasure: checkinData.rightThighMeasure || "",
    leftThighMeasure: checkinData.leftThighMeasure || "",
    rightCalfMeasure: checkinData.rightCalfMeasure || "",
    leftCalfMeasure: checkinData.leftCalfMeasure || "",
    chestMeasure: checkinData.chestMeasure || "",
    metabolicAge: checkinData.metabolicAge || "",
    visceralFat: checkinData.visceralFat || "",
    bmi: checkinData.bmi || "",
    waist: checkinData.waist || "",
    abdomen: checkinData.abdomen || "",
    hip: checkinData.hip || "",
    restingHeartRate: checkinData.restingHeartRate || "",
    averageTrainingHeartRate: checkinData.averageTrainingHeartRate || "",
    estimatedVo2: checkinData.estimatedVo2 || "",
    trainingExperience: checkinData.trainingExperience || "",
    trainingAge: checkinData.trainingAge || "",
    trainingBackground: checkinData.trainingBackground || "",
    injuryTags,
    trainingBackgroundTags,
    weeklyTrainingDays: checkinData.weeklyTrainingDays || "",
    trainingShift: checkinData.trainingShift || "",
    wakeTime: checkinData.wakeTime || "",
    sleepTime: checkinData.sleepTime || "",
    firstMealTime: checkinData.firstMealTime || "",
    lastMealTime: checkinData.lastMealTime || "",
    plannedTrainingTime: checkinData.plannedTrainingTime || "",
    availableMinutes: checkinData.availableMinutes || "",
    injuries: checkinData.injuries || "",
    dietaryRestrictions: checkinData.dietaryRestrictions || "",
    foodPreferences: checkinData.foodPreferences || "",
    mealsPerDay: checkinData.mealsPerDay || "",
    dietVariety: checkinData.dietVariety || "",
    energy: status === "missed" ? "" : checkinData.energy || "",
    sleep: status === "missed" ? "" : checkinData.sleep || "",
    adherence: status === "missed" ? "" : checkinData.adherence || "",
    hunger: checkinData.hunger || "",
    stress: checkinData.stress || "",
    digestion: checkinData.digestion || "",
    sleepQuality: checkinData.sleepQuality || "",
    fatigueLevel: checkinData.fatigueLevel || "",
    trainingPerformance: checkinData.trainingPerformance || "",
    weeklyWorkoutsPlanned: checkinData.weeklyWorkoutsPlanned || "",
    weeklyWorkoutsCompleted: checkinData.weeklyWorkoutsCompleted || "",
    workoutAdherence: checkinData.workoutAdherence || "",
    dietMealsPlanned: checkinData.dietMealsPlanned || "",
    dietMealsCompleted: checkinData.dietMealsCompleted || "",
    dietAdherence: checkinData.dietAdherence || "",
    protocolAction: checkinData.protocolAction || "none",
    notes:
      status === "missed"
        ? options.reason || "Check-in nao realizado."
        : checkinData.notes || "",
    photoNote: checkinData.photoNote || "",
    photos: Array.isArray(checkinData.photos) ? checkinData.photos : [],
    completeness,
    aiContext: buildAiContext({ ...normalizedCheckinData, cadence }, completeness, status),
    createdAt,
  };

  const currentWithoutSameDayAndType = options.allowMultiplePerDay
    ? current
    : current.filter(
        (item) =>
          !(
            normalizeCadence(item.cadence) === cadence &&
            getCheckinDateKey(item.createdAt) === checkinDateKey
          )
      );
  const updated = [newCheckin, ...currentWithoutSameDayAndType].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  return persistCheckins(updated);
}

export function saveMissedCheckin(cadence, reason = "", options = {}) {
  return saveCheckin(
    { ...defaultCheckinForm, cadence: normalizeCadence(cadence), protocolAction: "none" },
    {
      status: "missed",
      reason: reason || "Check-in nao realizado no periodo.",
      createdAt: options.createdAt,
    }
  );
}

export function resetCheckins() {
  localStorage.removeItem(CHECKINS_STORAGE_KEY);
  return [];
}

export function getCheckinMetrics(checkins) {
  const data = Array.isArray(checkins) ? checkins : [];
  const completed = completedOnly(data);
  const missed = data.filter((item) => item.status === "missed");
  const latest = completed[0];

  if (data.length === 0) {
    return [
      { label: "Ultimo check-in", value: "--", trend: "Nenhum registro salvo ainda" },
      { label: "Dias uteis", value: "--", trend: "Somente check-ins realizados entram na media" },
      { label: "Dados para o Personal Virtual", value: "--", trend: "Gaps ficam registrados e ignorados na media" },
      { label: "Historico", value: "0", trend: "Check-ins salvos" },
    ];
  }

  const completenessAverage = completed.length
    ? Math.round(
        completed.reduce(
          (sum, item) =>
            sum +
            Number(
              item.completeness ??
                calculateCheckinCompleteness({ ...defaultCheckinForm, ...item })
            ),
          0
        ) / completed.length
      )
    : 0;

  return [
    {
      label: "Ultimo check-in",
      value: latest ? new Date(latest.createdAt).toLocaleDateString("pt-BR") : "--",
      trend: latest ? `${checkinCadences[normalizeCadence(latest.cadence)].label} realizado` : "Ainda sem check-in realizado",
    },
    {
      label: "Dias uteis",
      value: `${completed.length}/${data.length}`,
      trend: `${missed.length} ausencia(s) registradas`,
    },
    {
      label: "Dados para o Personal Virtual",
      value: `${completenessAverage}%`,
      trend: "Media somente dos check-ins realizados",
    },
    {
      label: "Historico",
      value: `${data.length}`,
      trend: "Registros realizados e ausentes",
    },
  ];
}

export function getCheckinCadenceSummary(checkins) {
  const data = Array.isArray(checkins) ? checkins : [];

  return Object.keys(checkinCadences).map((cadence) => {
    const cadenceEntries = data.filter(
      (item) => normalizeCadence(item.cadence) === cadence
    );
    const completed = completedOnly(cadenceEntries);
    const missed = cadenceEntries.length - completed.length;

    return {
      cadence,
      label: checkinCadences[cadence].label,
      total: cadenceEntries.length,
      completed: completed.length,
      missed,
      energyAverage: average(completed, "energy"),
      sleepAverage: average(completed, "sleep"),
      adherenceAverage: average(completed, "adherence"),
    };
  });
}

export function getWeeklyAiDataset(checkins) {
  const weeklySources = completedOnly(
    (Array.isArray(checkins) ? checkins : []).filter((item) =>
      ["daily", "weekly"].includes(normalizeCadence(item.cadence))
    )
  );

  return {
    usableEntries: weeklySources.length,
    ignoredGaps: (Array.isArray(checkins) ? checkins : []).filter(
      (item) =>
        item.status === "missed" &&
        ["daily", "weekly"].includes(normalizeCadence(item.cadence))
    ).length,
    averages: {
      energy: average(weeklySources, "energy"),
      sleep: average(weeklySources, "sleep"),
      adherence: average(weeklySources, "adherence"),
    },
    rule: "O Personal Virtual deve calcular tendencias com check-ins semanais e sessoes de treino finalizadas. Ausencias registradas explicam lacunas, mas nao viram zero.",
  };
}

function resolveCycleStatus(endDate) {
  if (!endDate) {
    return {
      status: "sem-data",
      label: "Sem data final",
      detail: "Cadastre a data final do protocolo para ativar a logica mensal.",
    };
  }

  const today = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  const diffDays = daysBetween(today, end);

  if (diffDays < 0) {
    return {
      status: "atrasado",
      label: "Reavaliacao pendente",
      detail: `Ciclo encerrado ha ${Math.abs(diffDays)} dia(s).`,
    };
  }

  if (diffDays <= 3) {
    return {
      status: "proximo",
      label: "Reavaliacao proxima",
      detail: `Faltam ${diffDays} dia(s) para o fim do ciclo.`,
    };
  }

  return {
    status: "ok",
    label: "Ciclo em andamento",
    detail: `Faltam ${diffDays} dia(s) para a revisao.`,
  };
}

export function getMonthlyReevaluation() {
  const training = loadTrainingProtocol();
  const diet = loadDietProtocol();

  const trainingCycle = resolveCycleStatus(training?.endDate);
  const dietCycle = resolveCycleStatus(diet?.endDate);

  const reevaluationNeeded =
    trainingCycle.status === "atrasado" ||
    trainingCycle.status === "proximo" ||
    dietCycle.status === "atrasado" ||
    dietCycle.status === "proximo";

  return {
    reevaluationNeeded,
    training: {
      title: training?.title || "--",
      endDate: training?.endDate || "--",
      closurePlan: training?.closurePlan || null,
      cycle: trainingCycle,
    },
    diet: {
      title: diet?.title || "--",
      endDate: diet?.endDate || "--",
      cycle: dietCycle,
    },
    recommendedActions: [
      "Solicitar novas fotos",
      "Bioimpedancia opcional",
      "Revisar protocolo atual",
      "Renovar treino e dieta para o proximo ciclo",
    ],
  };
}
