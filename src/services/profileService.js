import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken, getStoredApiUser } from "./api/client";

export async function getCurrentUser() {
  if (!getApiToken()) {
    return { user: null, error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.me);
    return { user: data.user, error: null, skipped: false };
  } catch (error) {
    const storedUser = getStoredApiUser();
    return { user: storedUser, error, skipped: !storedUser };
  }
}

export async function loadRemoteProfile() {
  if (!getApiToken()) {
    return { profile: null, user: null, error: null, skipped: true };
  }

  try {
    const [profileData, userData] = await Promise.all([
      apiRequest(apiEndpoints.profile),
      apiRequest(apiEndpoints.me),
    ]);

    return { profile: profileData.profile, user: userData.user, error: null, skipped: false };
  } catch (error) {
    return { profile: null, user: getStoredApiUser(), error, skipped: false };
  }
}

export async function saveRemoteProfile(account) {
  if (!getApiToken()) {
    return { profile: null, user: null, error: null, skipped: true };
  }

  try {
    const [profileData, userData] = await Promise.all([
      apiRequest(apiEndpoints.profile, {
        method: "PUT",
        body: JSON.stringify(account),
      }),
      apiRequest(apiEndpoints.me),
    ]);

    return { profile: profileData.profile, user: userData.user, error: null, skipped: false };
  } catch (error) {
    return { profile: null, user: getStoredApiUser(), error, skipped: false };
  }
}

export async function uploadProfileAvatar() {
  return { path: null, signedUrl: null, error: new Error("Upload de avatar não implementado no backend."), skipped: false };
}
