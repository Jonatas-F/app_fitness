import { loadTrainingProtocol } from "./trainingStorage";
import { loadDietProtocol } from "./dietStorage";

const CHECKINS_STORAGE_KEY = "shapeCertoCheckins";

export const defaultCheckinForm = {
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
  visceralFat: "",
  waist: "",
  abdomen: "",
  hip: "",
  restingHeartRate: "",
  trainingExperience: "",
  weeklyTrainingDays: "",
  availableMinutes: "",
  injuries: "",
  dietaryRestrictions: "",
  foodPreferences: "",
  mealsPerDay: "",
  waterIntake: "",
  energy: "8",
  sleep: "",
  adherence: "85",
  hunger: "",
  stress: "",
  notes: "",
  photoNote: "",
};

export const requiredCheckinFields = [
  "goal",
  "weight",
  "height",
  "energy",
  "sleep",
  "adherence",
];

const checkinFieldLabels = {
  goal: "objetivo",
  weight: "peso",
  height: "altura",
  energy: "energia",
  sleep: "sono",
  adherence: "aderencia",
};

const aiRelevantOptionalFields = [
  "sport",
  "sex",
  "age",
  "bodyFat",
  "leanMass",
  "fatMass",
  "muscleMass",
  "visceralFat",
  "waist",
  "abdomen",
  "hip",
  "restingHeartRate",
  "trainingExperience",
  "weeklyTrainingDays",
  "availableMinutes",
  "injuries",
  "dietaryRestrictions",
  "foodPreferences",
  "mealsPerDay",
  "waterIntake",
  "hunger",
  "stress",
  "notes",
  "photoNote",
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

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function daysBetween(dateA, dateB) {
  const start = new Date(dateA);
  const end = new Date(dateB);
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function validateCheckinForm(checkinData) {
  const missingFields = requiredCheckinFields.filter(
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
  const fields = [...requiredCheckinFields, ...aiRelevantOptionalFields];
  const completed = fields.filter((field) => hasValue(checkinData[field])).length;
  return Math.round((completed / fields.length) * 100);
}

function buildAiContext(checkinData, completeness) {
  return {
    readiness: completeness >= 75 ? "alta" : completeness >= 45 ? "media" : "basica",
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
      visceralFat: checkinData.visceralFat || "",
      waist: checkinData.waist || "",
      abdomen: checkinData.abdomen || "",
      hip: checkinData.hip || "",
    },
    trainingContext: {
      sport: checkinData.sport || "",
      experience: checkinData.trainingExperience || "",
      weeklyDays: checkinData.weeklyTrainingDays || "",
      availableMinutes: checkinData.availableMinutes || "",
      injuries: checkinData.injuries || "",
      restingHeartRate: checkinData.restingHeartRate || "",
    },
    nutritionContext: {
      dietaryRestrictions: checkinData.dietaryRestrictions || "",
      foodPreferences: checkinData.foodPreferences || "",
      mealsPerDay: checkinData.mealsPerDay || "",
      waterIntake: checkinData.waterIntake || "",
      hunger: checkinData.hunger || "",
    },
    subjectiveContext: {
      sex: checkinData.sex || "",
      age: checkinData.age || "",
      stress: checkinData.stress || "",
      notes: checkinData.notes || "",
      photoNote: checkinData.photoNote || "",
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

export function saveCheckin(checkinData) {
  const current = loadCheckins();
  const completeness = calculateCheckinCompleteness(checkinData);

  const newCheckin = {
    id: `checkin-${Date.now()}`,
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
    visceralFat: checkinData.visceralFat || "",
    waist: checkinData.waist || "",
    abdomen: checkinData.abdomen || "",
    hip: checkinData.hip || "",
    restingHeartRate: checkinData.restingHeartRate || "",
    trainingExperience: checkinData.trainingExperience || "",
    weeklyTrainingDays: checkinData.weeklyTrainingDays || "",
    availableMinutes: checkinData.availableMinutes || "",
    injuries: checkinData.injuries || "",
    dietaryRestrictions: checkinData.dietaryRestrictions || "",
    foodPreferences: checkinData.foodPreferences || "",
    mealsPerDay: checkinData.mealsPerDay || "",
    waterIntake: checkinData.waterIntake || "",
    energy: checkinData.energy || "",
    sleep: checkinData.sleep || "",
    adherence: checkinData.adherence || "",
    hunger: checkinData.hunger || "",
    stress: checkinData.stress || "",
    notes: checkinData.notes || "",
    photoNote: checkinData.photoNote || "",
    completeness,
    aiContext: buildAiContext(checkinData, completeness),
    createdAt: getTodayDate(),
  };

  const updated = [newCheckin, ...current];
  localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function resetCheckins() {
  localStorage.removeItem(CHECKINS_STORAGE_KEY);
  return [];
}

export function getCheckinMetrics(checkins) {
  const data = Array.isArray(checkins) ? checkins : [];

  if (data.length === 0) {
    return [
      {
        label: "Ultimo check-in",
        value: "--",
        trend: "Nenhum registro salvo ainda",
      },
      {
        label: "Energia media",
        value: "--",
        trend: "Preencha check-ins para acompanhar",
      },
      {
        label: "Dados para IA",
        value: "--",
        trend: "Quanto mais dados, melhor o plano",
      },
      {
        label: "Historico",
        value: "0",
        trend: "Check-ins salvos",
      },
    ];
  }

  const latest = data[0];
  const energyAverage = (
    data.reduce((sum, item) => sum + Number(item.energy || 0), 0) / data.length
  ).toFixed(1);

  const completenessAverage = Math.round(
    data.reduce(
      (sum, item) =>
        sum +
        Number(
          item.completeness ??
            calculateCheckinCompleteness({ ...defaultCheckinForm, ...item })
        ),
      0
    ) / data.length
  );

  return [
    {
      label: "Ultimo check-in",
      value: new Date(latest.createdAt).toLocaleDateString("pt-BR"),
      trend: "Registro mais recente salvo",
    },
    {
      label: "Energia media",
      value: `${energyAverage}/10`,
      trend: "Baseada no historico atual",
    },
    {
      label: "Dados para IA",
      value: `${completenessAverage}%`,
      trend: "Completude media dos registros",
    },
    {
      label: "Historico",
      value: `${data.length}`,
      trend: "Check-ins salvos",
    },
  ];
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
