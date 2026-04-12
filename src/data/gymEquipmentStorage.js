import { allGymEquipment } from "./gymEquipmentCatalog";

const GYM_EQUIPMENT_SELECTION_KEY = "shapeCertoGymEquipmentSelection";

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export function getAllEquipmentIds() {
  return allGymEquipment.map((item) => item.id);
}

export function loadGymEquipmentSelection() {
  const allIds = getAllEquipmentIds();
  const raw = localStorage.getItem(GYM_EQUIPMENT_SELECTION_KEY);

  if (!raw) {
    return allIds;
  }

  const parsed = safeParse(raw, allIds);
  const savedIds = Array.isArray(parsed) ? parsed : allIds;
  const validSavedIds = savedIds.filter((id) => allIds.includes(id));
  const newCatalogIds = allIds.filter((id) => !savedIds.includes(id));

  return [...validSavedIds, ...newCatalogIds];
}

export function saveGymEquipmentSelection(selectedIds) {
  const allIds = getAllEquipmentIds();
  const validIds = selectedIds.filter((id) => allIds.includes(id));

  localStorage.setItem(GYM_EQUIPMENT_SELECTION_KEY, JSON.stringify(validIds));
  return validIds;
}

export function buildEquipmentAiContext(selectedIds) {
  const selectedSet = new Set(selectedIds);

  return {
    availableEquipment: allGymEquipment
      .filter((item) => selectedSet.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.categoryTitle,
      })),
    unavailableEquipment: allGymEquipment
      .filter((item) => !selectedSet.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        category: item.categoryTitle,
      })),
    rule:
      "O Personal Virtual deve montar treinos usando preferencialmente os aparelhos disponiveis. Aparelhos desmarcados devem ser evitados ou substituidos.",
  };
}
