import { pool } from "../../utils/db.js";

const defaultSettings = {
  notifications: {
    workoutReminder: true,
    mealReminder: true,
    waterReminder: true,
    progressReminder: true,
    weeklyCheckin: true,
    monthlyReevaluation: true,
  },
  personal: {
    name: "Ricardo",
    languageTone: "direto",
    motivationStyle: "equilibrado",
    feedbackDepth: "objetivo",
    avatarId: "default-personal",
  },
  privacy: {
    useOnlyOwnData: true,
    allowMediaAnalysis: true,
    saveChatHistory: false,
  },
};

function normalizeText(value, fallback, maxLength = 80) {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim().slice(0, maxLength);
}

function normalizeBooleanMap(value, fallback) {
  return Object.fromEntries(
    Object.entries(fallback).map(([key, defaultValue]) => [key, Boolean(value?.[key] ?? defaultValue)])
  );
}

function normalizeSettings(settings = {}) {
  return {
    notifications: normalizeBooleanMap(settings.notifications, defaultSettings.notifications),
    personal: {
      name: normalizeText(settings.personal?.name, defaultSettings.personal.name, 60),
      languageTone: normalizeText(settings.personal?.languageTone, defaultSettings.personal.languageTone, 40),
      motivationStyle: normalizeText(settings.personal?.motivationStyle, defaultSettings.personal.motivationStyle, 40),
      feedbackDepth: normalizeText(settings.personal?.feedbackDepth, defaultSettings.personal.feedbackDepth, 40),
      avatarId: normalizeText(settings.personal?.avatarId, defaultSettings.personal.avatarId, 120),
    },
    privacy: {
      ...normalizeBooleanMap(settings.privacy, defaultSettings.privacy),
      useOnlyOwnData: true,
    },
  };
}

function rowToSettings(row) {
  if (!row) {
    return defaultSettings;
  }

  return normalizeSettings({
    notifications: row.notifications,
    personal: {
      name: row.personal_name,
      languageTone: row.language_tone,
      motivationStyle: row.motivation_style,
      feedbackDepth: row.feedback_depth,
      avatarId: row.avatar_id,
    },
    privacy: row.privacy,
  });
}

export async function ensureLocalSettingsTables() {
  await pool.query(`
    create table if not exists user_settings (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade unique,
      notifications jsonb not null default '{}'::jsonb,
      privacy jsonb not null default '{}'::jsonb,
      personal_name text not null default 'Ricardo',
      language_tone varchar(40) not null default 'direto',
      motivation_style varchar(40) not null default 'equilibrado',
      feedback_depth varchar(40) not null default 'objetivo',
      avatar_id text not null default 'default-personal',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists idx_user_settings_personal_name
      on user_settings (lower(personal_name));

    create index if not exists idx_user_settings_language_tone
      on user_settings (language_tone);

    create index if not exists idx_user_settings_motivation_style
      on user_settings (motivation_style);
  `);
}

export async function loadUserSettings(accountId) {
  const result = await pool.query("select * from user_settings where account_id = $1 limit 1;", [accountId]);

  return rowToSettings(result.rows[0]);
}

export async function saveUserSettings(accountId, settings) {
  const normalized = normalizeSettings(settings);
  const result = await pool.query(
    `
      insert into user_settings (
        account_id,
        notifications,
        privacy,
        personal_name,
        language_tone,
        motivation_style,
        feedback_depth,
        avatar_id
      )
      values ($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7, $8)
      on conflict (account_id)
      do update set notifications = excluded.notifications,
                    privacy = excluded.privacy,
                    personal_name = excluded.personal_name,
                    language_tone = excluded.language_tone,
                    motivation_style = excluded.motivation_style,
                    feedback_depth = excluded.feedback_depth,
                    avatar_id = excluded.avatar_id,
                    updated_at = current_timestamp
      returning *;
    `,
    [
      accountId,
      JSON.stringify(normalized.notifications),
      JSON.stringify(normalized.privacy),
      normalized.personal.name,
      normalized.personal.languageTone,
      normalized.personal.motivationStyle,
      normalized.personal.feedbackDepth,
      normalized.personal.avatarId,
    ]
  );

  return rowToSettings(result.rows[0]);
}
