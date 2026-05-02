const API_TOKEN_KEY = "shapeCertoApiToken";
const API_USER_KEY = "shapeCertoApiUser";
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3333";

// True only when VITE_API_URL is explicitly set — avoids treating the
// hardcoded localhost fallback as a "real" configured backend.
export const isLocalApiConfigured = Boolean(import.meta.env.VITE_API_URL);

export function getApiToken() {
  return localStorage.getItem(API_TOKEN_KEY);
}

export function getStoredApiUser() {
  try {
    return JSON.parse(localStorage.getItem(API_USER_KEY)) || null;
  } catch (error) {
    return null;
  }
}

export function saveApiSession(data) {
  const token = data?.session?.access_token;

  if (token) {
    localStorage.setItem(API_TOKEN_KEY, token);
  }

  if (data?.user) {
    localStorage.setItem(API_USER_KEY, JSON.stringify(data.user));
  }

  window.dispatchEvent(new CustomEvent("shape-certo-auth-updated"));
}

export function clearApiSession() {
  localStorage.removeItem(API_TOKEN_KEY);
  localStorage.removeItem(API_USER_KEY);
}

export async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  const token = getApiToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error || "Erro na API local.");
    error.status = response.status;
    throw error;
  }

  return data;
}
