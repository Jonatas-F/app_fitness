import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

function dispatchTokensUpdated() {
  window.dispatchEvent(new CustomEvent("shape-certo-tokens-updated"));
}

export async function generateDietWithAi({
  goal = "",
  persist = false,
  dietApproach = "",
  trainingFocus = "",
  keepDietProtocol = "",
  requestedDietChanges = "",
} = {}) {
  const result = await apiRequest(apiEndpoints.aiDiet, {
    method: "POST",
    body: JSON.stringify({
      goal, persist, dietApproach, trainingFocus,
      keepDietProtocol, requestedDietChanges,
    }),
  });
  dispatchTokensUpdated();
  return result;
}
