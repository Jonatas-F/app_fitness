import { loadUserSettings, saveUserSettings } from "./settings.service.js";

export async function handleLoadSettings(req, res, next) {
  try {
    const settings = await loadUserSettings(req.auth.sub);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveSettings(req, res, next) {
  try {
    const settings = await saveUserSettings(req.auth.sub, req.body.settings || {});
    res.json({ settings });
  } catch (error) {
    next(error);
  }
}
