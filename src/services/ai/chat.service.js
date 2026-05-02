import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

/**
 * Envia uma mensagem ao Personal Virtual.
 * O backend carrega automaticamente o histórico do banco e salva o par de mensagens.
 */
export async function sendAiChatMessage(message) {
  return apiRequest(apiEndpoints.aiChat, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

/**
 * Carrega o histórico de mensagens persistido no banco (limitado a 10k tokens).
 */
export async function loadChatHistory() {
  return apiRequest(apiEndpoints.chatHistory);
}
