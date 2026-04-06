import { loadTrainingProtocol } from "./trainingStorage";
import { loadDietProtocol } from "./dietStorage";

const CHECKINS_STORAGE_KEY = "shapeCertoCheckins";

export const defaultCheckinForm = {
  weight: "",
  energy: "8",
  sleep: "",
  adherence: "85",
  notes: "",
  photoNote: "",
};

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

function daysBetween(dateA, dateB) {
  const start = new Date(dateA);
  const end = new Date(dateB);
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
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

  const newCheckin = {
    id: `checkin-${Date.now()}`,
    weight: checkinData.weight || "",
    energy: checkinData.energy || "",
    sleep: checkinData.sleep || "",
    adherence: checkinData.adherence || "",
    notes: checkinData.notes || "",
    photoNote: checkinData.photoNote || "",
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
        label: "Último check-in",
        value: "--",
        trend: "Nenhum registro salvo ainda",
      },
      {
        label: "Energia média",
        value: "--",
        trend: "Preencha check-ins para acompanhar",
      },
      {
        label: "Sono médio",
        value: "--",
        trend: "Horas registradas aparecem aqui",
      },
      {
        label: "Histórico",
        value: "0",
        trend: "Check-ins salvos",
      },
    ];
  }

  const latest = data[0];
  const energyAverage = (
    data.reduce((sum, item) => sum + Number(item.energy || 0), 0) / data.length
  ).toFixed(1);

  const validSleepEntries = data.filter((item) => String(item.sleep).trim());
  const sleepAverage = validSleepEntries.length
    ? (
        validSleepEntries.reduce(
          (sum, item) => sum + Number(item.sleep || 0),
          0
        ) / validSleepEntries.length
      ).toFixed(1)
    : "--";

  return [
    {
      label: "Último check-in",
      value: new Date(latest.createdAt).toLocaleDateString("pt-BR"),
      trend: "Registro mais recente salvo",
    },
    {
      label: "Energia média",
      value: `${energyAverage}/10`,
      trend: "Baseada no histórico atual",
    },
    {
      label: "Sono médio",
      value: sleepAverage === "--" ? "--" : `${sleepAverage}h`,
      trend: "Média dos check-ins registrados",
    },
    {
      label: "Histórico",
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
      detail: "Cadastre a data final do protocolo para ativar a lógica mensal.",
    };
  }

  const today = new Date();
  const end = new Date(`${endDate}T00:00:00`);
  const diffDays = daysBetween(today, end);

  if (diffDays < 0) {
    return {
      status: "atrasado",
      label: "Reavaliação pendente",
      detail: `Ciclo encerrado há ${Math.abs(diffDays)} dia(s).`,
    };
  }

  if (diffDays <= 3) {
    return {
      status: "proximo",
      label: "Reavaliação próxima",
      detail: `Faltam ${diffDays} dia(s) para o fim do ciclo.`,
    };
  }

  return {
    status: "ok",
    label: "Ciclo em andamento",
    detail: `Faltam ${diffDays} dia(s) para a revisão.`,
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
      "Bioimpedância opcional",
      "Revisar protocolo atual",
      "Renovar treino e dieta para o próximo ciclo",
    ],
  };
}