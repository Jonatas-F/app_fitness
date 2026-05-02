import { persistCheckins } from "../data/checkinStorage";
import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken } from "./api/client";

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

export async function loadRemoteCheckins() {
  if (!getApiToken()) {
    return { checkins: [], error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.checkins);
    const checkins = (data.checkins || []).map(toLocalCheckin);
    persistCheckins(checkins);
    return { checkins, error: null, skipped: false };
  } catch (error) {
    return { checkins: [], error, skipped: false };
  }
}

export async function saveRemoteCheckin(checkin) {
  if (!getApiToken()) {
    return { data: null, error: null, skipped: true };
  }

  try {
    const payload = {
      ...checkin,
      photos: Array.isArray(checkin.photos)
        ? checkin.photos.map(({ file, previewUrl, dataUrl, ...photo }) => photo)
        : checkin.photos,
    };
    const data = await apiRequest(apiEndpoints.checkins, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return { data: toLocalCheckin(data.checkin), error: null, skipped: false };
  } catch (error) {
    return { data: null, error, skipped: false };
  }
}

export async function deleteRemoteCheckins() {
  if (!getApiToken()) {
    return { error: null, skipped: true };
  }

  try {
    await apiRequest(apiEndpoints.checkins, { method: "DELETE" });
    return { error: null, skipped: false };
  } catch (error) {
    return { error, skipped: false };
  }
}
