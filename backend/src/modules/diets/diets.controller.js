import {
  listDietHistory,
  listDietMealLogs,
  loadActiveDietPlan,
  saveDietMealLog,
  saveDietPlan,
} from "./diets.service.js";

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

export async function handleListDietMealLogs(req, res, next) {
  try {
    const logs = await listDietMealLogs(req.auth.sub);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveDietMealLog(req, res, next) {
  try {
    const log = await saveDietMealLog(req.auth.sub, req.body);
    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
}
