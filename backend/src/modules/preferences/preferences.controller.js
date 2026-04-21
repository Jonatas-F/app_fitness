import {
  loadFoodPreferences,
  loadGymEquipmentSelection,
  saveFoodPreferences,
  saveGymEquipmentSelection,
} from "./preferences.service.js";

export async function handleLoadFoodPreferences(req, res, next) {
  try {
    const preferences = await loadFoodPreferences(req.auth.sub);
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveFoodPreferences(req, res, next) {
  try {
    const preferences = await saveFoodPreferences(req.auth.sub, req.body.preferences || {});
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
}

export async function handleLoadGymEquipment(req, res, next) {
  try {
    const selectedIds = await loadGymEquipmentSelection(req.auth.sub);
    res.json({ selectedIds });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveGymEquipment(req, res, next) {
  try {
    const selectedIds = await saveGymEquipmentSelection(req.auth.sub, req.body.selectedIds || []);
    res.json({ selectedIds });
  } catch (error) {
    next(error);
  }
}
