import {
  generateAiChatResponse,
  generateAiDietPlan,
  generateAiWorkoutPlan,
} from "./ai.service.js";

export async function handleAiChat(req, res, next) {
  try {
    const result = await generateAiChatResponse(req.auth.sub, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGenerateAiDiet(req, res, next) {
  try {
    const result = await generateAiDietPlan(req.auth.sub, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGenerateAiWorkout(req, res, next) {
  try {
    const result = await generateAiWorkoutPlan(req.auth.sub, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
