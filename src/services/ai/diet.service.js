import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

export async function generateDietWithAi({ goal = "", persist = false } = {}) {
  return apiRequest(apiEndpoints.aiDiet, {
    method: "POST",
    body: JSON.stringify({ goal, persist }),
  });
}
