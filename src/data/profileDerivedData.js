import { loadProfileData, getProfileCompletion } from "./profileStorage";

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
  const completion = getProfileCompletion(profile);

  return {
    completion,
    updatedAt: profile?.metadata?.updatedAt || null,
    basic: {
      fullName: formatFallback(profile?.basic?.fullName),
      age: formatFallback(profile?.basic?.age),
      height: formatHeight(profile?.basic?.height),
      weight: formatWeight(profile?.basic?.weight),
      sex: formatFallback(profile?.basic?.sex),
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