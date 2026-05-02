import { apiEndpoints } from "./api/endpoints";
import {
  apiRequest,
  clearApiSession,
  saveApiSession,
} from "./api/client";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3333";
const GOOGLE_RETURN_KEY = "shapeCertoGoogleReturnTo";

export function rememberGoogleReturnTo(returnTo) {
  sessionStorage.setItem(GOOGLE_RETURN_KEY, returnTo);
}

export function buildGoogleSignInUrl(options = {}) {
  const returnTo = options.returnTo || `${window.location.pathname}${window.location.search}`;
  const appOrigin = options.appOrigin || window.location.origin;
  const url = new URL(`${apiUrl}${apiEndpoints.google}`);
  url.searchParams.set("app_origin", appOrigin);
  url.searchParams.set("return_to", returnTo);
  return url.toString();
}

export async function signInWithEmail({ email, password }) {
  try {
    const data = await apiRequest(apiEndpoints.signIn, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    saveApiSession(data);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signUpWithEmail({ email, password, fullName, plan }) {
  try {
    const data = await apiRequest(apiEndpoints.signUp, {
      method: "POST",
      body: JSON.stringify({ email, password, fullName, plan }),
    });

    saveApiSession(data);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function signInWithGoogle(options = {}) {
  const returnTo = options.returnTo || `${window.location.pathname}${window.location.search}`;
  rememberGoogleReturnTo(returnTo);
  const signInUrl = buildGoogleSignInUrl({ returnTo });
  window.location.assign(signInUrl);
  return { data: null, error: null };
}

export async function signOut() {
  try {
    await apiRequest(apiEndpoints.signOut, { method: "POST" });
  } catch {
    // Remove sessão local mesmo se o backend estiver offline.
  }

  clearApiSession();
  return { error: null };
}
