import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

/**
 * Envia uma mensagem ao Personal Virtual.
 * O backend carrega automaticamente o histórico do banco e salva o par de mensagens.
 * personalName é lido do localStorage para garantir que o modelo use o nome correto
 * mesmo quando as configurações ainda não foram sincronizadas com o banco.
 */
export async function sendAiChatMessage(message) {
  let personalName = null;
  try {
    const s = JSON.parse(localStorage.getItem("shapeCertoSettings") || "{}");
    personalName = s?.personal?.name || null;
  } catch {
    // silently ignore
  }

  return apiRequest(apiEndpoints.aiChat, {
    method: "POST",
    body: JSON.stringify({ message, personalName }),
  });
}

/**
 * Carrega o histórico de mensagens persistido no banco (limitado a 10k tokens).
 */
export async function loadChatHistory() {
  return apiRequest(apiEndpoints.chatHistory);
}
