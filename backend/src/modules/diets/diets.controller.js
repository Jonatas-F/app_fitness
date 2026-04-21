import { listDietHistory, loadActiveDietPlan, saveDietPlan } from "./diets.service.js";

export async function handleLoadDietPlan(req, res, next) {
  try {
    const protocol = await loadActiveDietPlan(req.auth.sub);
    res.json({ protocol });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveDietPlan(req, res, next) {
  try {
    const protocol = await saveDietPlan(req.auth.sub, req.body);
    res.json({ protocol });
  } catch (error) {
    next(error);
  }
}

export async function handleListDietHistory(req, res, next) {
  try {
    const history = await listDietHistory(req.auth.sub);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}
