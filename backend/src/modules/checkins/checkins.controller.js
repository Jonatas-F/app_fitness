import { deleteCheckins, listCheckins, saveCheckin } from "./checkins.service.js";

export async function handleListCheckins(req, res, next) {
  try {
    const checkins = await listCheckins(req.auth.sub);
    res.json({ checkins });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveCheckin(req, res, next) {
  try {
    const checkin = await saveCheckin(req.auth.sub, req.body);
    res.json({ checkin });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteCheckins(req, res, next) {
  try {
    await deleteCheckins(req.auth.sub);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
