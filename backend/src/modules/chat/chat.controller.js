import { loadChatHistory } from "./chat.service.js";

export async function handleLoadChatHistory(req, res, next) {
  try {
    const messages = await loadChatHistory(req.auth.sub);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
}
