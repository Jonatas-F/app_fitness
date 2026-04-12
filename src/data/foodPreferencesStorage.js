import { allFoodPreferenceItems, foodMarkOptions } from "./foodPreferencesCatalog";

const FOOD_PREFERENCES_KEY = "shapeCertoFoodPreferences";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getValidItemIds() {
  return allFoodPreferenceItems.map((item) => item.id);
}

export function loadFoodPreferences() {
  const raw = localStorage.getItem(FOOD_PREFERENCES_KEY);

  if (!raw) {
    return {};
  }

  const parsed = safeParse(raw, {});
  const validIds = new Set(getValidItemIds());
  const validMarks = new Set(foodMarkOptions.map((option) => option.id));

  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([itemId, mark]) => validIds.has(itemId) && validMarks.has(mark)
    )
  );
}

export function saveFoodPreferences(preferences) {
  const validIds = new Set(getValidItemIds());
  const validMarks = new Set(foodMarkOptions.map((option) => option.id));
  const cleaned = Object.fromEntries(
    Object.entries(preferences).filter(
      ([itemId, mark]) => validIds.has(itemId) && validMarks.has(mark)
    )
  );

  localStorage.setItem(FOOD_PREFERENCES_KEY, JSON.stringify(cleaned));
  return cleaned;
}

export function buildFoodPreferencesContext(preferences) {
  const entries = allFoodPreferenceItems
    .filter((item) => preferences[item.id])
    .map((item) => ({
      id: item.id,
      name: item.name,
      group: item.group,
      subgroup: item.subgroup,
      mark: preferences[item.id],
    }));

  return {
    selectedPreferences: entries,
    rule:
      "O Personal Virtual deve respeitar alergias, intolerancias e itens evitados. Itens marcados como gosto ou quero incluir podem ser priorizados quando fizerem sentido para o objetivo.",
  };
}
