import { savePlanAcceptanceLocally } from "../data/planAcceptanceStorage";
import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken } from "./api/client";

export async function savePlanChangeAcceptance(record) {
  const localRecord = savePlanAcceptanceLocally(record);

  if (!getApiToken()) {
    return { data: localRecord, error: null, skipped: true };
  }

  try {
    const result = await apiRequest(apiEndpoints.planChangeAcceptances, {
      method: "POST",
      body: JSON.stringify(record),
    });

    return { data: result.data || localRecord, error: null, skipped: false };
  } catch (error) {
    return { data: localRecord, error, skipped: false };
  }
}
