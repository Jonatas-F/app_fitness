/* Helpers compartilhados pelas visões de plano (treino + dieta) estilo PDF. */

export const WEEK_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const DAY_LABELS = {
  monday: "SEG", tuesday: "TER", wednesday: "QUA", thursday: "QUI",
  friday: "SEX", saturday: "SAB", sunday: "DOM",
};

export const GOAL_TITLE_MAP = {
  hipertrofia: "HIPERTROFIA",
  powerlifting: "FORÇA MÁXIMA",
  emagrecimento: "EMAGRECIMENTO",
  recomposicao: "RECOMPOSIÇÃO",
  cutting: "DEFINIÇÃO",
  condicionamento: "CONDICIONAMENTO",
  saude: "SAÚDE & BEM-ESTAR",
};

const DAY_COLOR_MAP = {
  peito: "c-accent", costas: "c-purple", ombro: "c-blue", braco: "c-blue",
  biceps: "c-blue", triceps: "c-blue", posterior: "c-orange", quad: "c-green",
  perna: "c-green", gluteo: "c-orange", push: "c-accent", pull: "c-purple",
  legs: "c-green", full: "c-blue",
};

export function getFocusColor(focus) {
  const f = (focus || "").toLowerCase();
  for (const [key, color] of Object.entries(DAY_COLOR_MAP)) {
    if (f.includes(key)) return color;
  }
  return "c-accent";
}

const MEAL_COLOR_MAP = {
  "pre-treino": "c-orange",
  "pos-treino": "c-blue",
  "ceia": "c-purple",
};

export function getMealColor(mealId) {
  return MEAL_COLOR_MAP[mealId] || "";
}

export function goalTitleHtml(goal) {
  return GOAL_TITLE_MAP[goal] || String(goal || "Plano").toUpperCase();
}
