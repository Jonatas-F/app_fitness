import { loadProfile, saveProfile } from "./users.service.js";

export async function handleLoadProfile(req, res, next) {
  try {
    const profile = await loadProfile(req.auth.sub);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveProfile(req, res, next) {
  try {
    const profile = await saveProfile(req.auth.sub, req.body);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}
