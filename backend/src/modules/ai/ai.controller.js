import {
  generateAiChatResponse,
  generateAiDietPlan,
  generateAiWorkoutPlan,
} from "./ai.service.js";
import { loadChatHistory, saveMessagePair } from "../chat/chat.service.js";

export async function handleAiChat(req, res, next) {
  try {
    const accountId = req.auth.sub;
    const { message, personalName } = req.body;

    // Carrega histórico persistido do banco (respeitando limite de 10k tokens)
    const dbHistory = await loadChatHistory(accountId);
    const history = dbHistory.map((m) => ({ role: m.role, text: m.content }));

    const result = await generateAiChatResponse(accountId, { message, history, personalName });

    // Persiste o par user → assistant no banco
    await saveMessagePair(accountId, {
      userMessage: message,
      assistantMessage: result.text,
      aiRunId: result.run?.id ? Number(result.run.id) : null,
    });

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
