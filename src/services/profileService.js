import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";
import { getSignedFileUrl, uploadUserFile } from "./storageService";

export async function getCurrentUser() {
  if (!isSupabaseConfigured) {
    return { user: null, error: null, skipped: true };
  }

  const { data, error } = await requireSupabase().auth.getUser();
  return { user: data?.user || null, error, skipped: false };
}

export async function loadRemoteProfile() {
  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { profile: null, user, error: userError, skipped };
  }

  const { data, error } = await requireSupabase()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { profile: null, user, error, skipped: false };
  }

  return { profile: data, user, error: null, skipped: false };
}

export async function saveRemoteProfile(account) {
  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { profile: null, user, error: userError, skipped };
  }

  const payload = {
    id: user.id,
    full_name: account.fullName || "",
    username: account.username || null,
    active_plan: account.activePlan || "intermediario",
    billing_cycle: account.billingCycle || "monthly",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await requireSupabase()
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  return { profile: data, user, error, skipped: false };
}

export async function uploadProfileAvatar(file) {
  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { path: null, signedUrl: null, error: userError, skipped };
  }

  const upload = await uploadUserFile({
    bucket: "avatars",
    userId: user.id,
    folder: "profile",
    file,
  });

  if (upload.error || upload.skipped) {
    return { path: null, signedUrl: null, error: upload.error, skipped: upload.skipped };
  }

  await requireSupabase()
    .from("profiles")
    .upsert(
      {
        id: user.id,
        avatar_path: upload.path,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  const signed = await getSignedFileUrl({ bucket: "avatars", path: upload.path });

  return {
    path: upload.path,
    signedUrl: signed.data?.signedUrl || null,
    error: signed.error,
    skipped: false,
  };
}
