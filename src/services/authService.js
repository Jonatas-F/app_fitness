import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";
import { apiEndpoints } from "./api/endpoints";
import {
  apiRequest,
  clearApiSession,
  isLocalApiConfigured,
  saveApiSession,
} from "./api/client";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3333";
const GOOGLE_RETURN_KEY = "shapeCertoGoogleReturnTo";

export async function signInWithEmail({ email, password }) {
  if (isLocalApiConfigured) {
    try {
      const data = await apiRequest(apiEndpoints.signIn, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      saveApiSession(data);

      return { data, error: null, skipped: false, provider: "postgres" };
    } catch (error) {
      return { data: null, error, skipped: false, provider: "postgres" };
    }
  }

  if (!isSupabaseConfigured) {
    return { data: null, error: null, skipped: true };
  }

  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email,
    password,
  });

  return { data, error, skipped: false };
}

export async function signUpWithEmail({ email, password, fullName, plan }) {
  if (isLocalApiConfigured) {
    try {
      const data = await apiRequest(apiEndpoints.signUp, {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, plan }),
      });

      saveApiSession(data);

      return { data, error: null, skipped: false, provider: "postgres" };
    } catch (error) {
      return { data: null, error, skipped: false, provider: "postgres" };
    }
  }

  if (!isSupabaseConfigured) {
    return { data: null, error: null, skipped: true };
  }

  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        active_plan: plan,
      },
    },
  });

  return { data, error, skipped: false };
}

export async function signInWithGoogle(options = {}) {
  if (isLocalApiConfigured) {
    const returnTo = options.returnTo || `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem(GOOGLE_RETURN_KEY, returnTo);

    const url = new URL(`${apiUrl}${apiEndpoints.google}`);
    url.searchParams.set("app_origin", window.location.origin);
    url.searchParams.set("return_to", returnTo);
    window.location.href = url.toString();
    return { data: null, error: null, skipped: false, provider: "postgres" };
  }

  if (!isSupabaseConfigured) {
    return { data: null, error: null, skipped: true };
  }

  const redirectTo = `${import.meta.env.VITE_APP_URL || window.location.origin}/dashboard`;
  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  return { data, error, skipped: false };
}

export async function signOut() {
  if (isLocalApiConfigured) {
    try {
      await apiRequest(apiEndpoints.signOut, { method: "POST" });
    } catch (error) {
      // Sessao local tambem deve ser removida se o backend estiver desligado.
    }

    clearApiSession();
    return { error: null, skipped: false, provider: "postgres" };
  }

  if (!isSupabaseConfigured) {
    return { error: null, skipped: true };
  }

  const { error } = await requireSupabase().auth.signOut();
  return { error, skipped: false };
}
