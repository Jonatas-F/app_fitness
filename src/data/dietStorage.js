const DIET_CURRENT_KEY = "shapeCertoDietCurrent";
const DIET_HISTORY_KEY = "shapeCertoDietHistory";

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
    notes: "",
  }));
}

export function createExampleDietProtocol() {
  const now = new Date();

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
    ...createExampleDietProtocol(),
    id: `diet-${Date.now()}`,
    title: "Nova dieta",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
  };
}

function normalizeDietProtocol(protocol) {
  const base = createNewDietProtocolTemplate();
  const existingMeals = new Map((protocol?.meals || []).map((meal) => [meal.id, meal]));

  return {
    ...base,
    ...protocol,
    meals: mealSlots.map((meal, index) => ({
      ...meal,
      enabled:
        typeof existingMeals.get(meal.id)?.enabled === "boolean"
          ? existingMeals.get(meal.id).enabled
        : ["cafe-manha", "almoco", "cafe-tarde", "janta"].includes(meal.id),
      calories: existingMeals.get(meal.id)?.calories || "",
      protein: existingMeals.get(meal.id)?.protein || "",
      carbs: existingMeals.get(meal.id)?.carbs || "",
      fats: existingMeals.get(meal.id)?.fats || "",
      foods: existingMeals.get(meal.id)?.foods || "",
      notes: existingMeals.get(meal.id)?.notes || "",
    })),
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
