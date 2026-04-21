import { loadAssistantContext } from "./assistant.service.js";

export async function handleLoadAssistantContext(req, res, next) {
  try {
    const context = await loadAssistantContext(req.auth.sub);
    res.json({ context });
  } catch (error) {
    next(error);
  }
}
