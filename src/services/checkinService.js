import { persistCheckins } from "../data/checkinStorage";
import { getCurrentUser } from "./profileService";
import { uploadUserFile } from "./storageService";
import { isSupabaseConfigured, requireSupabase } from "./supabaseClient";

function toLocalCheckin(row) {
  const payload = row.payload || {};
  const storedFiles = Array.isArray(row.checkin_files)
    ? row.checkin_files.map((file) => ({
        id: file.pose || file.id,
        title: file.pose || file.kind,
        fileName: file.path?.split("/").pop() || file.kind,
        pose: file.pose || "",
        bucket: file.bucket,
        path: file.path,
        selected: true,
      }))
    : [];

  return {
    ...payload,
    id: row.id,
    cadence: row.cadence,
    status: row.status,
    photos: Array.isArray(payload.photos) && payload.photos.length ? payload.photos : storedFiles,
    aiContext: row.ai_context || payload.aiContext || {},
    createdAt: row.created_at,
  };
}

function getCheckinDate(checkin) {
  const createdAt = checkin.createdAt || new Date().toISOString();
  return createdAt.slice(0, 10);
}

function stripTransientPhotoData(checkin) {
  const payload = { ...checkin };
  delete payload.aiContext;

  if (Array.isArray(payload.photos)) {
    payload.photos = payload.photos.map(({ file, ...photo }) => photo);
  }

  return payload;
}

async function uploadRemoteCheckinPhotos({ userId, checkinId, photoUploads }) {
  const uploads = Object.entries(photoUploads || {}).filter(([, upload]) => upload?.file);

  if (!uploads.length) {
    return { photos: [], error: null };
  }

  await requireSupabase().from("checkin_files").delete().eq("checkin_id", checkinId);

  const photos = [];

  for (const [poseId, upload] of uploads) {
    const fileUpload = await uploadUserFile({
      bucket: "checkin-media",
      userId,
      folder: `checkins/${checkinId}`,
      file: upload.file,
    });

    if (fileUpload.error) {
      return { photos, error: fileUpload.error };
    }

    if (fileUpload.skipped) {
      continue;
    }

    const fileRow = {
      user_id: userId,
      checkin_id: checkinId,
      kind: "progress-photo",
      pose: poseId,
      bucket: "checkin-media",
      path: fileUpload.path,
    };
    const { error } = await requireSupabase().from("checkin_files").insert(fileRow);

    if (error) {
      return { photos, error };
    }

    photos.push({
      id: poseId,
      title: upload.title || poseId,
      fileName: upload.fileName || upload.file?.name || "foto",
      pose: poseId,
      bucket: "checkin-media",
      path: fileUpload.path,
      selected: true,
    });
  }

  return { photos, error: null };
}

export async function loadRemoteCheckins() {
  if (!isSupabaseConfigured) {
    return { checkins: [], error: null, skipped: true };
  }

  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { checkins: [], error: userError, skipped };
  }

  const { data, error } = await requireSupabase()
    .from("checkins")
    .select("*, checkin_files(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { checkins: [], error, skipped: false };
  }

  const checkins = (data || []).map(toLocalCheckin);
  persistCheckins(checkins);

  return { checkins, error: null, skipped: false };
}

export async function saveRemoteCheckin(checkin, photoUploads = {}) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null, skipped: true };
  }

  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { data: null, error: userError, skipped };
  }

  const createdAt = checkin.createdAt || new Date().toISOString();
  const checkinDate = getCheckinDate(checkin);
  const payload = stripTransientPhotoData(checkin);
  const supabase = requireSupabase();

  const { data: existing, error: lookupError } = await supabase
    .from("checkins")
    .select("id")
    .eq("user_id", user.id)
    .eq("cadence", checkin.cadence || "monthly")
    .eq("checkin_date", checkinDate)
    .maybeSingle();

  if (lookupError) {
    return { data: null, error: lookupError, skipped: false };
  }

  const remotePayload = {
      user_id: user.id,
      cadence: checkin.cadence || "monthly",
      status: checkin.status || "completed",
      checkin_date: checkinDate,
      payload,
      ai_context: checkin.aiContext || {},
      created_at: createdAt,
      updated_at: new Date().toISOString(),
  };
  const query = existing?.id
    ? supabase.from("checkins").update(remotePayload).eq("id", existing.id)
    : supabase.from("checkins").insert(remotePayload);

  const { data, error } = await query
    .select("*, checkin_files(*)")
    .single();

  if (error) {
    return { data: null, error, skipped: false };
  }

  const uploaded = await uploadRemoteCheckinPhotos({
    userId: user.id,
    checkinId: data.id,
    photoUploads,
  });

  if (uploaded.error) {
    return { data: toLocalCheckin(data), error: uploaded.error, skipped: false };
  }

  if (uploaded.photos.length) {
    const payloadWithPhotos = {
      ...payload,
      photos: uploaded.photos,
    };
    const { data: updatedData, error: updateError } = await supabase
      .from("checkins")
      .update({
        payload: payloadWithPhotos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*, checkin_files(*)")
      .single();

    return {
      data: updatedData ? toLocalCheckin(updatedData) : toLocalCheckin(data),
      error: updateError,
      skipped: false,
    };
  }

  return { data: toLocalCheckin(data), error: null, skipped: false };
}

export async function deleteRemoteCheckins() {
  if (!isSupabaseConfigured) {
    return { error: null, skipped: true };
  }

  const { user, error: userError, skipped } = await getCurrentUser();

  if (skipped || userError || !user) {
    return { error: userError, skipped };
  }

  const { error } = await requireSupabase()
    .from("checkins")
    .delete()
    .eq("user_id", user.id);

  return { error, skipped: false };
}
