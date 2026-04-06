const PROFILE_STORAGE_KEY = "shape-certo.profile.v1";

export function getDefaultProfileData() {
  return {
    basic: {
      fullName: "",
      age: "",
      height: "",
      weight: "",
      sex: "",
    },
    goals: {
      primaryGoal: "",
      conditioningGoal: "",
      notes: "",
    },
    diet: {
      strategy: "",
      mealsPerDay: "",
      waterPerDay: "",
      preferences: "",
    },
    metadata: {
      updatedAt: null,
      version: 1,
    },
  };
}

export function loadProfileData() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!raw) {
      return getDefaultProfileData();
    }

    const parsed = JSON.parse(raw);

    return {
      ...getDefaultProfileData(),
      ...parsed,
      basic: {
        ...getDefaultProfileData().basic,
        ...(parsed.basic || {}),
      },
      goals: {
        ...getDefaultProfileData().goals,
        ...(parsed.goals || {}),
      },
      diet: {
        ...getDefaultProfileData().diet,
        ...(parsed.diet || {}),
      },
      metadata: {
        ...getDefaultProfileData().metadata,
        ...(parsed.metadata || {}),
      },
    };
  } catch {
    return getDefaultProfileData();
  }
}

export function saveProfileData(profileData) {
  const payload = {
    ...getDefaultProfileData(),
    ...profileData,
    basic: {
      ...getDefaultProfileData().basic,
      ...(profileData.basic || {}),
    },
    goals: {
      ...getDefaultProfileData().goals,
      ...(profileData.goals || {}),
    },
    diet: {
      ...getDefaultProfileData().diet,
      ...(profileData.diet || {}),
    },
    metadata: {
      ...getDefaultProfileData().metadata,
      ...(profileData.metadata || {}),
      updatedAt: new Date().toISOString(),
    },
  };

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function resetProfileData() {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  return getDefaultProfileData();
}

export function getProfileCompletion(profileData) {
  const fields = [
    profileData?.basic?.fullName,
    profileData?.basic?.age,
    profileData?.basic?.height,
    profileData?.basic?.weight,
    profileData?.basic?.sex,
    profileData?.goals?.primaryGoal,
    profileData?.goals?.conditioningGoal,
    profileData?.diet?.strategy,
    profileData?.diet?.mealsPerDay,
    profileData?.diet?.waterPerDay,
  ];

  const filled = fields.filter((value) => String(value || "").trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

export { PROFILE_STORAGE_KEY };