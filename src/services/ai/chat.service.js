import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

/**
 * Envia uma mensagem ao Personal Virtual.
 * @param {string} message - Texto atual do usuário.
 * @param {Array}  conversationHistory - Histórico [{role, text}] para contexto de múltiplos turnos.
 */
export async function sendAiChatMessage(message, conversationHistory = []) {
  return apiRequest(apiEndpoints.aiChat, {
    method: "POST",
    body: JSON.stringify({ message, history: conversationHistory }),
  });
}
