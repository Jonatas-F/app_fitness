const PROFILE_STORAGE_KEY = "shapeCertoProfileCurrent";
const PROFILE_HISTORY_STORAGE_KEY = "shapeCertoProfileHistory";

export const defaultProfileData = {
  basic: {
    fullName: "",
    age: "",
    height: "",
    weight: "",
    sex: "",
    bodyFat: "",
    leanMass: "",
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
    createdAt: null,
    updatedAt: null,
    lastChangedFields: [],
  },
};

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeProfileData(profile) {
  return {
    basic: {
      fullName: profile?.basic?.fullName || "",
      age: profile?.basic?.age || "",
      height: profile?.basic?.height || "",
      weight: profile?.basic?.weight || "",
      sex: profile?.basic?.sex || "",
      bodyFat: profile?.basic?.bodyFat || "",
      leanMass: profile?.basic?.leanMass || "",
    },
    goals: {
      primaryGoal: profile?.goals?.primaryGoal || "",
      conditioningGoal: profile?.goals?.conditioningGoal || "",
      notes: profile?.goals?.notes || "",
    },
    diet: {
      strategy: profile?.diet?.strategy || "",
      mealsPerDay: profile?.diet?.mealsPerDay || "",
      waterPerDay: profile?.diet?.waterPerDay || "",
      preferences: profile?.diet?.preferences || "",
    },
    metadata: {
      createdAt: profile?.metadata?.createdAt || null,
      updatedAt: profile?.metadata?.updatedAt || null,
      lastChangedFields: Array.isArray(profile?.metadata?.lastChangedFields)
        ? profile.metadata.lastChangedFields
        : [],
    },
  };
}

function getChangedFields(previousProfile, nextProfile) {
  const changedFields = [];

  const sections = ["basic", "goals", "diet"];

  sections.forEach((section) => {
    Object.keys(nextProfile[section]).forEach((field) => {
      const previousValue = String(previousProfile?.[section]?.[field] || "").trim();
      const nextValue = String(nextProfile?.[section]?.[field] || "").trim();

      if (previousValue !== nextValue) {
        changedFields.push(`${section}.${field}`);
      }
    });
  });

  return changedFields;
}

function hasAnyProfileContent(profile) {
  const sections = ["basic", "goals", "diet"];

  return sections.some((section) =>
    Object.values(profile?.[section] || {}).some((value) => String(value || "").trim())
  );
}

export function loadProfileData() {
  const raw = localStorage.getItem(PROFILE_STORAGE_KEY);

  if (!raw) {
    return deepClone(defaultProfileData);
  }

  const parsed = safeJsonParse(raw, defaultProfileData);
  return normalizeProfileData(parsed);
}

export function loadProfileHistory() {
  const raw = localStorage.getItem(PROFILE_HISTORY_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  const parsed = safeJsonParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveProfileData(nextProfileData) {
  const previousProfile = loadProfileData();
  const normalizedNextProfile = normalizeProfileData(nextProfileData);
  const currentHistory = loadProfileHistory();

  const changedFields = getChangedFields(previousProfile, normalizedNextProfile);
  const now = new Date().toISOString();

  const finalProfile = {
    ...normalizedNextProfile,
    metadata: {
      ...normalizedNextProfile.metadata,
      createdAt: previousProfile?.metadata?.createdAt || now,
      updatedAt: now,
      lastChangedFields: changedFields,
    },
  };

  if (hasAnyProfileContent(previousProfile) && changedFields.length > 0) {
    const snapshot = {
      id: `${Date.now()}`,
      savedAt: now,
      previousUpdatedAt: previousProfile?.metadata?.updatedAt || null,
      changedFields,
      profile: {
        basic: { ...previousProfile.basic },
        goals: { ...previousProfile.goals },
        diet: { ...previousProfile.diet },
      },
    };

    localStorage.setItem(
      PROFILE_HISTORY_STORAGE_KEY,
      JSON.stringify([snapshot, ...currentHistory])
    );
  }

  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(finalProfile));
  return finalProfile;
}

export function resetProfileData() {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  localStorage.removeItem(PROFILE_HISTORY_STORAGE_KEY);
  return deepClone(defaultProfileData);
}

export function getProfileCompletion(profile) {
  const normalized = normalizeProfileData(profile);

  const fields = [
    normalized.basic.fullName,
    normalized.basic.age,
    normalized.basic.height,
    normalized.basic.weight,
    normalized.basic.sex,
    normalized.basic.bodyFat,
    normalized.basic.leanMass,
    normalized.goals.primaryGoal,
    normalized.goals.conditioningGoal,
    normalized.goals.notes,
    normalized.diet.strategy,
    normalized.diet.mealsPerDay,
    normalized.diet.waterPerDay,
    normalized.diet.preferences,
  ];

  const filledCount = fields.filter((value) => String(value || "").trim()).length;
  return Math.round((filledCount / fields.length) * 100);
}

export function getLatestProfileComparison() {
  const currentProfile = loadProfileData();
  const history = loadProfileHistory();
  const previousSnapshot = history[0] || null;

  if (!previousSnapshot) {
    return null;
  }

  return {
    current: currentProfile,
    previous: previousSnapshot.profile,
    changedFields: previousSnapshot.changedFields || [],
    savedAt: previousSnapshot.savedAt,
  };
}