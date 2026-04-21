import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken, isLocalApiConfigured } from "./api/client";

export async function loadAssistantContext() {
  if (!isLocalApiConfigured || !getApiToken()) {
    return { context: null, error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.assistantContext);
    return { context: data.context, error: null, skipped: false };
  } catch (error) {
    return { context: null, error, skipped: false };
  }
}
