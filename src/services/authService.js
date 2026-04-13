import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";

export async function signInWithEmail({ email, password }) {
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

export async function signInWithGoogle() {
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
  if (!isSupabaseConfigured) {
    return { error: null, skipped: true };
  }

  const { error } = await requireSupabase().auth.signOut();
  return { error, skipped: false };
}
