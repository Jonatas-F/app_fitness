import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken, isLocalApiConfigured } from "./api/client";

export async function loadRemoteSettings() {
  if (!isLocalApiConfigured || !getApiToken()) {
    return { settings: null, error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.settings);
    return { settings: data?.settings || null, error: null, skipped: false };
  } catch (error) {
    return { settings: null, error, skipped: false };
  }
}

export async function saveRemoteSettings(settings) {
  if (!isLocalApiConfigured || !getApiToken()) {
    return { settings: null, error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.settings, {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });

    return { settings: data?.settings || null, error: null, skipped: false };
  } catch (error) {
    return { settings: null, error, skipped: false };
  }
}
