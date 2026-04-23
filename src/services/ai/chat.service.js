import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

export async function sendAiChatMessage(message) {
  return apiRequest(apiEndpoints.aiChat, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
