const DIET_CURRENT_KEY = "shapeCertoDietCurrent";
const DIET_HISTORY_KEY = "shapeCertoDietHistory";

function formatDateInput(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getDefaultMeals() {
  return [
    {
      id: "meal-1",
      name: "Café da manhã",
      description: "Ovos, aveia e fruta",
    },
    {
      id: "meal-2",
      name: "Almoço",
      description: "Frango, arroz, legumes e salada",
    },
    {
      id: "meal-3",
      name: "Jantar",
      description: "Proteína magra, carboidrato moderado e vegetais",
    },
  ];
}

function getBlankMeals() {
  return [
    { id: "meal-1", name: "Refeição 1", description: "" },
    { id: "meal-2", name: "Refeição 2", description: "" },
    { id: "meal-3", name: "Refeição 3", description: "" },
  ];
}

export function createExampleDietProtocol() {
  const now = new Date();

  return {
    id: `diet-${Date.now()}`,
    title: "Dieta Hipertrofia 01",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
    nutritionalGoal: "Superávit controlado para ganho de massa magra",
    strategy: "Alta proteína com distribuição equilibrada de carboidratos",
    hydration: "3,5 litros por dia",
    notes:
      "Plano alimentar base com foco em recuperação, energia para treino e constância semanal.",
    meals: getDefaultMeals(),
    metadata: {
      createdAt: null,
      updatedAt: null,
      closedAt: null,
    },
  };
}

export function createNewDietProtocolTemplate() {
  const now = new Date();

  return {
    id: `diet-${Date.now()}`,
    title: "Nova dieta",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
    nutritionalGoal: "",
    strategy: "",
    hydration: "",
    notes: "",
    meals: getBlankMeals(),
    metadata: {
      createdAt: null,
      updatedAt: null,
      closedAt: null,
    },
  };
}

function normalizeDietProtocol(protocol) {
  const base = createNewDietProtocolTemplate();

  return {
    id: protocol?.id || base.id,
    title: protocol?.title || base.title,
    startDate: protocol?.startDate || base.startDate,
    endDate: protocol?.endDate || base.endDate,
    nutritionalGoal: protocol?.nutritionalGoal || "",
    strategy: protocol?.strategy || "",
    hydration: protocol?.hydration || "",
    notes: protocol?.notes || "",
    meals: Array.isArray(protocol?.meals)
      ? protocol.meals.map((meal, index) => ({
          id: meal?.id || `meal-${index + 1}`,
          name: meal?.name || `Refeição ${index + 1}`,
          description: meal?.description || "",
        }))
      : base.meals,
    metadata: {
      createdAt: protocol?.metadata?.createdAt || null,
      updatedAt: protocol?.metadata?.updatedAt || null,
      closedAt: protocol?.metadata?.closedAt || null,
    },
  };
}

export function loadDietProtocol() {
  const raw = localStorage.getItem(DIET_CURRENT_KEY);

  if (!raw) {
    return createExampleDietProtocol();
  }

  return normalizeDietProtocol(safeParse(raw, createExampleDietProtocol()));
}

export function loadDietHistory() {
  const raw = localStorage.getItem(DIET_HISTORY_KEY);

  if (!raw) {
    return [];
  }

  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveDietProtocol(protocol) {
  const current = loadDietProtocol();
  const normalized = normalizeDietProtocol(protocol);
  const now = new Date().toISOString();

  const finalProtocol = {
    ...normalized,
    metadata: {
      ...normalized.metadata,
      createdAt: current?.metadata?.createdAt || now,
      updatedAt: now,
      closedAt: null,
    },
  };

  localStorage.setItem(DIET_CURRENT_KEY, JSON.stringify(finalProtocol));
  return finalProtocol;
}

export function closeDietProtocol(protocol) {
  const normalized = normalizeDietProtocol(protocol);
  const history = loadDietHistory();
  const now = new Date().toISOString();

  const finalizedProtocol = {
    ...normalized,
    metadata: {
      ...normalized.metadata,
      createdAt: normalized?.metadata?.createdAt || now,
      updatedAt: now,
      closedAt: now,
    },
  };

  const updatedHistory = [finalizedProtocol, ...history];
  localStorage.setItem(DIET_HISTORY_KEY, JSON.stringify(updatedHistory));

  const nextDiet = createNewDietProtocolTemplate();
  localStorage.setItem(DIET_CURRENT_KEY, JSON.stringify(nextDiet));

  return {
    currentDiet: nextDiet,
    history: updatedHistory,
  };
}

export function resetDietState() {
  localStorage.removeItem(DIET_CURRENT_KEY);
  localStorage.removeItem(DIET_HISTORY_KEY);
  return createExampleDietProtocol();
}

export function getDietMetrics(protocol, history) {
  const current = normalizeDietProtocol(protocol);
  const dietHistory = Array.isArray(history) ? history : [];

  const mealsCount = current.meals.filter(
    (meal) => meal.name.trim() || meal.description.trim()
  ).length;

  const today = new Date();
  const endDate = current.endDate ? new Date(`${current.endDate}T00:00:00`) : null;

  let daysRemaining = "--";

  if (endDate && !Number.isNaN(endDate.getTime())) {
    const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    daysRemaining = diff >= 0 ? `${diff} dias` : "Encerrada";
  }

  return [
    {
      label: "Plano atual",
      value: current.title || "--",
      trend: "Protocolo alimentar em andamento",
    },
    {
      label: "Refeições",
      value: `${mealsCount}`,
      trend: "Itens cadastrados no plano atual",
    },
    {
      label: "Fim do ciclo",
      value: daysRemaining,
      trend: "Janela prevista para revisão nutricional",
    },
    {
      label: "Histórico",
      value: `${dietHistory.length}`,
      trend: "Dietas anteriores salvas",
    },
  ];
}