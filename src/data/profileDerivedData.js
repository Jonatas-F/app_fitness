import {
  loadProfileData,
  loadProfileHistory,
  getProfileCompletion,
  getLatestProfileComparison,
} from "./profileStorage";

function formatFallback(value, fallback = "--") {
  return String(value || "").trim() ? value : fallback;
}

function formatWeight(weight) {
  const value = String(weight || "").trim();
  if (!value) return "--";
  return value.toLowerCase().includes("kg") ? value : `${value} kg`;
}

function formatHeight(height) {
  const value = String(height || "").trim();
  if (!value) return "--";
  return value.toLowerCase().includes("m") ? value : value;
}

export function getProfileSummary() {
  const profile = loadProfileData();
  const history = loadProfileHistory();
  const completion = getProfileCompletion(profile);

  return {
    completion,
    updatedAt: profile?.metadata?.updatedAt || null,
    historyCount: history.length,
    basic: {
      fullName: formatFallback(profile?.basic?.fullName),
      age: formatFallback(profile?.basic?.age),
      height: formatHeight(profile?.basic?.height),
      weight: formatWeight(profile?.basic?.weight),
      sex: formatFallback(profile?.basic?.sex),
      bodyFat: formatFallback(profile?.basic?.bodyFat),
      leanMass: formatFallback(profile?.basic?.leanMass),
    },
    goals: {
      primaryGoal: formatFallback(profile?.goals?.primaryGoal),
      conditioningGoal: formatFallback(profile?.goals?.conditioningGoal),
      notes: formatFallback(profile?.goals?.notes),
    },
    diet: {
      strategy: formatFallback(profile?.diet?.strategy),
      mealsPerDay: formatFallback(profile?.diet?.mealsPerDay),
      waterPerDay: formatFallback(profile?.diet?.waterPerDay),
      preferences: formatFallback(profile?.diet?.preferences),
    },
  };
}

export function getDashboardMetricsFromProfile() {
  const summary = getProfileSummary();

  return [
    {
      label: "Peso atual",
      value: summary.basic.weight,
      trend: "Dado vindo do perfil salvo",
    },
    {
      label: "Meta principal",
      value: summary.goals.primaryGoal,
      trend: "Objetivo ativo do usuário",
    },
    {
      label: "Preenchimento",
      value: `${summary.completion}%`,
      trend: "Quanto mais completo, melhor para a IA",
    },
    {
      label: "Estratégia alimentar",
      value: summary.diet.strategy,
      trend: "Base para dieta personalizada",
    },
  ];
}

export function getProgressMetricsFromProfile() {
  const summary = getProfileSummary();

  return [
    {
      label: "Peso",
      value: summary.basic.weight,
      trend: "Último dado salvo no perfil",
    },
    {
      label: "Objetivo",
      value: summary.goals.primaryGoal,
      trend: "Meta usada nas próximas leituras",
    },
    {
      label: "Água",
      value: summary.diet.waterPerDay,
      trend: "Referência atual de hidratação",
    },
    {
      label: "Preenchimento",
      value: `${summary.completion}%`,
      trend: "Base para progresso e recomendações",
    },
  ];
}

export function getProfileHighlights() {
  const summary = getProfileSummary();

  return [
    `Objetivo principal: ${summary.goals.primaryGoal}`,
    `Foco de condicionamento: ${summary.goals.conditioningGoal}`,
    `Peso atual informado: ${summary.basic.weight}`,
    `Estratégia alimentar: ${summary.diet.strategy}`,
    `Preenchimento do perfil: ${summary.completion}%`,
  ];
}

export function getProfileHistorySummary() {
  return loadProfileHistory().map((entry) => ({
    id: entry.id,
    savedAt: entry.savedAt,
    previousUpdatedAt: entry.previousUpdatedAt,
    changedFields: entry.changedFields || [],
    basic: {
      fullName: formatFallback(entry?.profile?.basic?.fullName),
      weight: formatWeight(entry?.profile?.basic?.weight),
      bodyFat: formatFallback(entry?.profile?.basic?.bodyFat),
      leanMass: formatFallback(entry?.profile?.basic?.leanMass),
    },
    goals: {
      primaryGoal: formatFallback(entry?.profile?.goals?.primaryGoal),
      conditioningGoal: formatFallback(entry?.profile?.goals?.conditioningGoal),
    },
    diet: {
      strategy: formatFallback(entry?.profile?.diet?.strategy),
      waterPerDay: formatFallback(entry?.profile?.diet?.waterPerDay),
    },
  }));
}

export function getCurrentVsPreviousComparison() {
  const comparison = getLatestProfileComparison();

  if (!comparison) {
    return null;
  }

  return {
    savedAt: comparison.savedAt,
    changedFields: comparison.changedFields,
    current: {
      weight: formatWeight(comparison?.current?.basic?.weight),
      bodyFat: formatFallback(comparison?.current?.basic?.bodyFat),
      leanMass: formatFallback(comparison?.current?.basic?.leanMass),
      primaryGoal: formatFallback(comparison?.current?.goals?.primaryGoal),
      strategy: formatFallback(comparison?.current?.diet?.strategy),
    },
    previous: {
      weight: formatWeight(comparison?.previous?.basic?.weight),
      bodyFat: formatFallback(comparison?.previous?.basic?.bodyFat),
      leanMass: formatFallback(comparison?.previous?.basic?.leanMass),
      primaryGoal: formatFallback(comparison?.previous?.goals?.primaryGoal),
      strategy: formatFallback(comparison?.previous?.diet?.strategy),
    },
  };
}