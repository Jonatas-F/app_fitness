const DIET_CURRENT_KEY = "shapeCertoDietCurrent";
const DIET_HISTORY_KEY = "shapeCertoDietHistory";

export const dietDays = [
  { id: "segunda", short: "SEG", name: "Segunda" },
  { id: "terca", short: "TER", name: "Terca" },
  { id: "quarta", short: "QUA", name: "Quarta" },
  { id: "quinta", short: "QUI", name: "Quinta" },
  { id: "sexta", short: "SEX", name: "Sexta" },
  { id: "sabado", short: "SAB", name: "Sabado" },
  { id: "domingo", short: "DOM", name: "Domingo" },
];

export const mealSlots = [
  { id: "desjejum", name: "Desjejum" },
  { id: "cafe-manha", name: "Café da manhã" },
  { id: "brunch", name: "Brunch" },
  { id: "almoco", name: "Almoço" },
  { id: "cafe-tarde", name: "Café da tarde" },
  { id: "pre-treino", name: "Pré-treino" },
  { id: "pos-treino", name: "Pós-treino" },
  { id: "janta", name: "Janta" },
  { id: "ceia", name: "Ceia" },
];

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
  const defaultEnabledMeals = new Set(["cafe-manha", "almoco", "cafe-tarde", "janta"]);

  return mealSlots.map((meal, index) => ({
    ...meal,
    enabled: defaultEnabledMeals.has(meal.id),
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
    foods: "",
    description: "",
    notes: "",
  }));
}

function normalizeMeals(meals) {
  const existingMeals = new Map((Array.isArray(meals) ? meals : []).map((meal) => [meal.id, meal]));

  return mealSlots.map((meal) => {
    const existing = existingMeals.get(meal.id) || {};

    return {
      ...meal,
      ...existing,
      enabled:
        typeof existing.enabled === "boolean"
          ? existing.enabled
          : ["cafe-manha", "almoco", "cafe-tarde", "janta"].includes(meal.id),
      calories: existing.calories || "",
      protein: existing.protein || "",
      carbs: existing.carbs || "",
      fats: existing.fats || "",
      foods: existing.foods || "",
      description: existing.description || existing.foods || "",
      notes: existing.notes || "",
    };
  });
}

function getDefaultDayPlans(sourceMeals) {
  const meals = normalizeMeals(sourceMeals || getDefaultMeals());

  return dietDays.map((day) => ({
    ...day,
    meals: meals.map((meal) => ({ ...meal })),
  }));
}

export function createExampleDietProtocol() {
  const now = new Date();
  const meals = getDefaultMeals();

  return {
    id: `diet-${Date.now()}`,
    title: "Plano alimentar atual",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
    nutritionalGoal: "Plano ajustado pelo Personal Virtual",
    recommendedMeals: "5",
    userAvailableMeals: "",
    restrictionNotes: "",
    preferenceNotes: "",
    guidance:
      "Se o usuário informar poucas refeições disponíveis, o Personal Virtual deve respeitar a agenda e sinalizar a quantidade recomendada.",
    meals,
    dayPlans: getDefaultDayPlans(meals),
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
    ...createExampleDietProtocol(),
    id: `diet-${Date.now()}`,
    title: "Nova dieta",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
  };
}

function normalizeDietProtocol(protocol) {
  const base = createNewDietProtocolTemplate();
  const baseMeals = normalizeMeals(protocol?.meals || base.meals);
  const existingDayPlans = new Map(
    (Array.isArray(protocol?.dayPlans) ? protocol.dayPlans : []).map((day) => [day.id, day])
  );
  const dayPlans = dietDays.map((day) => {
    const existingDay = existingDayPlans.get(day.id);

    return {
      ...day,
      ...existingDay,
      meals: normalizeMeals(existingDay?.meals || baseMeals),
    };
  });

  return {
    ...base,
    ...protocol,
    meals: dayPlans[0]?.meals || baseMeals,
    dayPlans,
    metadata: {
      createdAt: protocol?.metadata?.createdAt || null,
      updatedAt: protocol?.metadata?.updatedAt || null,
      closedAt: protocol?.metadata?.closedAt || null,
    },
  };
}

export function loadDietProtocol() {
  const raw = localStorage.getItem(DIET_CURRENT_KEY);
  return raw ? normalizeDietProtocol(safeParse(raw, createExampleDietProtocol())) : createExampleDietProtocol();
}

export function loadDietHistory() {
  const raw = localStorage.getItem(DIET_HISTORY_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
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
  return { currentDiet: nextDiet, history: updatedHistory };
}

export function resetDietState() {
  localStorage.removeItem(DIET_CURRENT_KEY);
  localStorage.removeItem(DIET_HISTORY_KEY);
  return createExampleDietProtocol();
}

export function getDietMetrics(protocol, history) {
  const current = normalizeDietProtocol(protocol);
  const enabledMeals = current.meals.filter((meal) => meal.enabled).length;
  return [
    { label: "Refeições ativas", value: `${enabledMeals}`, trend: "Habilitadas pelo Personal Virtual" },
    { label: "Disponibilidade", value: current.userAvailableMeals || "--", trend: "Agenda informada pelo usuário" },
    { label: "Recomendado", value: current.recommendedMeals || "--", trend: "Sugestão do Personal Virtual" },
    { label: "Histórico", value: `${Array.isArray(history) ? history.length : 0}`, trend: "Dietas anteriores salvas" },
  ];
}
