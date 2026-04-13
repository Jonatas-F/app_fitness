import { loadTrainingProtocol } from "./trainingStorage";
import { loadDietProtocol } from "./dietStorage";

const CHECKINS_STORAGE_KEY = "shapeCertoCheckins";

export const checkinCadences = {
  daily: {
    label: "Diario",
    description: "Sinais rapidos de sono, energia, fome, estresse e aderencia.",
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
  cadence: "monthly",
  goal: "hipertrofia",
  sport: "",
  sex: "",
  age: "",
  weight: "",
  height: "",
  bodyFat: "",
  leanMass: "",
  fatMass: "",
  muscleMass: "",
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
  rightThighMeasure: "",
  leftThighMeasure: "",
  visceralFat: "",
  waist: "",
  abdomen: "",
  hip: "",
  restingHeartRate: "",
  trainingExperience: "",
  weeklyTrainingDays: "",
  trainingShift: "",
  availableMinutes: "",
  injuries: "",
  dietaryRestrictions: "",
  foodPreferences: "",
  mealsPerDay: "",
  energy: "8",
  sleep: "",
  adherence: "85",
  hunger: "",
  stress: "",
  digestion: "",
  trainingPerformance: "",
  protocolAction: "none",
  notes: "",
  photoNote: "",
  photos: [],
};

const requiredFieldsByCadence = {
  daily: ["energy", "sleep", "adherence"],
  weekly: ["weight", "energy", "sleep", "adherence"],
  monthly: ["goal", "weight", "height", "energy", "sleep", "adherence"],
};

const checkinFieldLabels = {
  goal: "objetivo",
  weight: "peso",
  height: "altura",
  energy: "energia",
  sleep: "sono",
  adherence: "aderencia",
};

const aiRelevantFields = [
  "goal",
  "sport",
  "sex",
  "age",
  "weight",
  "height",
  "bodyFat",
  "leanMass",
  "fatMass",
  "muscleMass",
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
  "rightThighMeasure",
  "leftThighMeasure",
  "visceralFat",
  "waist",
  "abdomen",
  "hip",
  "restingHeartRate",
  "trainingExperience",
  "weeklyTrainingDays",
  "trainingShift",
  "availableMinutes",
  "injuries",
  "dietaryRestrictions",
  "foodPreferences",
  "mealsPerDay",
  "energy",
  "sleep",
  "adherence",
  "hunger",
  "stress",
  "digestion",
  "trainingPerformance",
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

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function daysBetween(dateA, dateB) {
  const start = new Date(dateA);
  const end = new Date(dateB);
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function normalizeCadence(cadence) {
  return checkinCadences[cadence] ? cadence : "monthly";
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
      weight: checkinData.weight || "",
      height: checkinData.height || "",
      energy: checkinData.energy || "",
      sleep: checkinData.sleep || "",
      adherence: checkinData.adherence || "",
    },
    bodyComposition: {
      bodyFat: checkinData.bodyFat || "",
      leanMass: checkinData.leanMass || "",
      fatMass: checkinData.fatMass || "",
      muscleMass: checkinData.muscleMass || "",
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
      visceralFat: checkinData.visceralFat || "",
      waist: checkinData.waist || "",
      abdomen: checkinData.abdomen || "",
      hip: checkinData.hip || "",
    },
    trainingContext: {
      sport: checkinData.sport || "",
      experience: checkinData.trainingExperience || "",
      weeklyDays: checkinData.weeklyTrainingDays || "",
      shift: checkinData.trainingShift || "",
      availableMinutes: checkinData.availableMinutes || "",
      injuries: checkinData.injuries || "",
      restingHeartRate: checkinData.restingHeartRate || "",
      performance: checkinData.trainingPerformance || "",
    },
    nutritionContext: {
      dietaryRestrictions: checkinData.dietaryRestrictions || "",
      foodPreferences: checkinData.foodPreferences || "",
      mealsPerDay: checkinData.mealsPerDay || "",
      hunger: checkinData.hunger || "",
      digestion: checkinData.digestion || "",
    },
    subjectiveContext: {
      sex: checkinData.sex || "",
      age: checkinData.age || "",
      stress: checkinData.stress || "",
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

export function saveCheckin(checkinData, options = {}) {
  const current = loadCheckins();
  const cadence = normalizeCadence(checkinData.cadence);
  const status = options.status || "completed";
  const completeness =
    status === "missed" ? 0 : calculateCheckinCompleteness({ ...checkinData, cadence });

  const newCheckin = {
    id: `checkin-${cadence}-${Date.now()}`,
    cadence,
    status,
    goal: checkinData.goal || "",
    sport: checkinData.sport || "",
    sex: checkinData.sex || "",
    age: checkinData.age || "",
    weight: checkinData.weight || "",
    height: checkinData.height || "",
    bodyFat: checkinData.bodyFat || "",
    leanMass: checkinData.leanMass || "",
    fatMass: checkinData.fatMass || "",
    muscleMass: checkinData.muscleMass || "",
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
    visceralFat: checkinData.visceralFat || "",
    waist: checkinData.waist || "",
    abdomen: checkinData.abdomen || "",
    hip: checkinData.hip || "",
    restingHeartRate: checkinData.restingHeartRate || "",
    trainingExperience: checkinData.trainingExperience || "",
    weeklyTrainingDays: checkinData.weeklyTrainingDays || "",
    trainingShift: checkinData.trainingShift || "",
    availableMinutes: checkinData.availableMinutes || "",
    injuries: checkinData.injuries || "",
    dietaryRestrictions: checkinData.dietaryRestrictions || "",
    foodPreferences: checkinData.foodPreferences || "",
    mealsPerDay: checkinData.mealsPerDay || "",
    energy: status === "missed" ? "" : checkinData.energy || "",
    sleep: status === "missed" ? "" : checkinData.sleep || "",
    adherence: status === "missed" ? "" : checkinData.adherence || "",
    hunger: checkinData.hunger || "",
    stress: checkinData.stress || "",
    digestion: checkinData.digestion || "",
    trainingPerformance: checkinData.trainingPerformance || "",
    protocolAction: checkinData.protocolAction || "none",
    notes:
      status === "missed"
        ? options.reason || "Check-in nao realizado."
        : checkinData.notes || "",
    photoNote: checkinData.photoNote || "",
    photos: Array.isArray(checkinData.photos) ? checkinData.photos : [],
    completeness,
    aiContext: buildAiContext({ ...checkinData, cadence }, completeness, status),
    createdAt: getCreatedAtFromOptions(options),
  };

  const updated = [newCheckin, ...current].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
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
    rule: "O Personal Virtual deve calcular tendencias somente com check-ins diarios e semanais realizados. Ausencias registradas explicam lacunas, mas nao viram zero.",
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
