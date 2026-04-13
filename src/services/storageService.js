import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";

export async function uploadUserFile({ bucket, userId, folder, file }) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null, skipped: true };
  }

  const extension = file.name.split(".").pop();
  const safeName = `${crypto.randomUUID()}.${extension}`;
  const path = `${userId}/${folder}/${safeName}`;
  const { data, error } = await requireSupabase().storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  return { data, error, path, skipped: false };
}

export async function getSignedFileUrl({ bucket, path, expiresIn = 3600 }) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null, skipped: true };
  }

  const { data, error } = await requireSupabase()
    .storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  return { data, error, skipped: false };
}
