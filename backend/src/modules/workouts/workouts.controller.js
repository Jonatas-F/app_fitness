import {
  listWorkoutSessions,
  loadActiveWorkoutPlan,
  saveWorkoutPlan,
  saveWorkoutSession,
} from "./workouts.service.js";

export async function handleLoadWorkoutPlan(req, res, next) {
  try {
    const protocol = await loadActiveWorkoutPlan(req.auth.sub);
    res.json({ protocol });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveWorkoutPlan(req, res, next) {
  try {
    const protocol = await saveWorkoutPlan(req.auth.sub, req.body);
    res.json({ protocol });
  } catch (error) {
    next(error);
  }
}

export async function handleListWorkoutSessions(req, res, next) {
  try {
    const sessions = await listWorkoutSessions(req.auth.sub);
    res.json({ sessions });
  } catch (error) {
    next(error);
  }
}

export async function handleSaveWorkoutSession(req, res, next) {
  try {
    const session = await saveWorkoutSession(req.auth.sub, req.body);
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
}
