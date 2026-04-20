const PLAN_ACCEPTANCE_HISTORY_KEY = "shapeCertoPlanAcceptanceHistory";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export function loadPlanAcceptanceHistory() {
  const rawHistory = localStorage.getItem(PLAN_ACCEPTANCE_HISTORY_KEY);

  if (!rawHistory) {
    return [];
  }

  const parsedHistory = safeJsonParse(rawHistory, []);
  return Array.isArray(parsedHistory) ? parsedHistory : [];
}

export function savePlanAcceptanceLocally(record) {
  const history = loadPlanAcceptanceHistory();
  const localRecord = {
    id: record.id || `${Date.now()}`,
    ...record,
  };

  localStorage.setItem(PLAN_ACCEPTANCE_HISTORY_KEY, JSON.stringify([localRecord, ...history]));
  return localRecord;
}
