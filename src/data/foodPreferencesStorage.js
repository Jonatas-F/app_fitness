import { allFoodPreferenceItems, foodMarkOptions } from "./foodPreferencesCatalog";
import { apiEndpoints } from "../services/api/endpoints";
import { apiRequest, getApiToken, isLocalApiConfigured } from "../services/api/client";

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

function createDefaultFoodPreferences() {
  return Object.fromEntries(
    allFoodPreferenceItems
      .filter((item) => item.allowedMarks.includes("quero_incluir"))
      .map((item) => [item.id, "quero_incluir"])
  );
}

export function loadFoodPreferences() {
  const raw = localStorage.getItem(FOOD_PREFERENCES_KEY);

  if (!raw) {
    const defaults = createDefaultFoodPreferences();
    localStorage.setItem(FOOD_PREFERENCES_KEY, JSON.stringify(defaults));
    return defaults;
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
  syncFoodPreferencesToApi(cleaned);
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

export async function hydrateFoodPreferencesFromApi() {
  if (!isLocalApiConfigured || !getApiToken()) {
    return { preferences: loadFoodPreferences(), skipped: true, error: null };
  }

  try {
    const data = await apiRequest(apiEndpoints.foodPreferences);
    const remotePreferences = data.preferences || {};

    if (Object.keys(remotePreferences).length) {
      return { preferences: saveFoodPreferences(remotePreferences), skipped: false, error: null };
    }

    const preferences = loadFoodPreferences();
    await syncFoodPreferencesToApi(preferences);

    return { preferences, skipped: false, error: null };
  } catch (error) {
    return { preferences: loadFoodPreferences(), skipped: false, error };
  }
}

async function syncFoodPreferencesToApi(preferences) {
  if (!isLocalApiConfigured || !getApiToken()) {
    return;
  }

  try {
    await apiRequest(apiEndpoints.foodPreferences, {
      method: "PUT",
      body: JSON.stringify({ preferences }),
    });
  } catch (error) {
    console.warn("Nao foi possivel sincronizar preferencias alimentares.", error);
  }
}
