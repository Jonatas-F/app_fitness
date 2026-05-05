import { pool } from "../../utils/db.js";

/**
 * Cria as tabelas auxiliares de contexto do assistente caso não existam.
 * Estas tabelas armazenam dados de saúde, metas, medidas e fotos usados
 * para enriquecer o contexto da IA.
 */
export async function ensureLocalAssistantTables() {
  // Objetivos do usuário
  await pool.query(`
    create table if not exists user_goals (
      id           bigint generated always as identity primary key,
      account_id   bigint not null references accounts(id) on delete cascade,
      title        varchar(255),
      description  text,
      goal_type    varchar(80),
      target_value decimal(10,2),
      unit         varchar(40),
      is_active    boolean not null default true,
      created_at   timestamptz not null default now(),
      updated_at   timestamptz not null default now()
    )
  `);

  // Perfil de saúde
  await pool.query(`
    create table if not exists user_health_profiles (
      id                  bigint generated always as identity primary key,
      account_id          bigint not null references accounts(id) on delete cascade,
      height_cm           decimal(5,1),
      birth_date          date,
      biological_sex      varchar(20),
      activity_level      varchar(40),
      main_goal           varchar(80),
      training_experience varchar(40),
      health_conditions   text,
      medications         text,
      created_at          timestamptz not null default now(),
      updated_at          timestamptz not null default now()
    )
  `);

  // Preferências nutricionais
  await pool.query(`
    create table if not exists user_nutrition_preferences (
      id                 bigint generated always as identity primary key,
      account_id         bigint not null references accounts(id) on delete cascade,
      diet_type          varchar(80),
      meals_per_day      integer,
      allergies_notes    text,
      restrictions_notes text,
      preferred_foods    text,
      disliked_foods     text,
      created_at         timestamptz not null default now(),
      updated_at         timestamptz not null default now()
    )
  `);

  // Medidas corporais
  await pool.query(`
    create table if not exists body_measurements (
      id          bigint generated always as identity primary key,
      account_id  bigint not null references accounts(id) on delete cascade,
      measured_at timestamptz not null default now(),
      weight_kg   decimal(6,2),
      chest_cm    decimal(5,1),
      waist_cm    decimal(5,1),
      hips_cm     decimal(5,1),
      thigh_cm    decimal(5,1),
      arm_cm      decimal(5,1),
      calf_cm     decimal(5,1),
      neck_cm     decimal(5,1),
      notes       text,
      created_at  timestamptz not null default now()
    )
  `);

  // Registros de bioimpedância
  await pool.query(`
    create table if not exists bioimpedance_records (
      id                bigint generated always as identity primary key,
      account_id        bigint not null references accounts(id) on delete cascade,
      recorded_at       timestamptz not null default now(),
      body_fat_pct      decimal(5,2),
      muscle_mass_kg    decimal(6,2),
      visceral_fat_level integer,
      bone_mass_kg      decimal(5,2),
      water_pct         decimal(5,2),
      bmr               integer,
      notes             text,
      created_at        timestamptz not null default now()
    )
  `);

  // Fotos de progresso
  await pool.query(`
    create table if not exists progress_photos (
      id               bigint generated always as identity primary key,
      account_id       bigint not null references accounts(id) on delete cascade,
      captured_at      timestamptz not null default now(),
      angle_type       varchar(40),
      image_url        text,
      storage_key      text,
      comparison_group varchar(80),
      notes            text,
      created_at       timestamptz not null default now()
    )
  `);
}

function compactRows(rows, limit = 12) {
  return (rows || []).slice(0, limit);
}

function sanitizePaymentProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    gateway: profile.gateway,
    default_payment_method_id: profile.default_payment_method_id,
    updated_at: profile.updated_at,
  };
}

export async function loadAssistantContext(accountId) {
  const [
    accountResult,
    profileResult,
    checkinsResult,
    workoutPlanResult,
    workoutSessionsResult,
    dietPlanResult,
    dietHistoryResult,
    foodPreferencesResult,
    gymEquipmentResult,
    goalsResult,
    healthResult,
    nutritionResult,
    measurementsResult,
    bioimpedanceResult,
    progressPhotosResult,
    subscriptionResult,
    paymentProfileResult,
    settingsResult,
  ] = await Promise.all([
    pool.query(
      `
        select id, email, plan_type, billing_cycle, account_status, created_at, last_login_at
        from accounts
        where id = $1
        limit 1;
      `,
      [accountId]
    ),
    pool.query("select * from user_profiles where account_id = $1 limit 1;", [accountId]),
    pool.query(
      `
        select id, cadence, status, payload, ai_context, created_at, updated_at
        from checkins
        where account_id = $1
        order by created_at desc
        limit 24;
      `,
      [accountId]
    ),
    pool.query(
      `
        select id, payload, plan_status, created_at, updated_at
        from training_plans
        where account_id = $1
        order by updated_at desc, id desc
        limit 1;
      `,
      [accountId]
    ),
    pool.query(
      `
        select id, payload, created_at
        from workout_sessions
        where account_id = $1
        order by created_at desc, id desc
        limit 20;
      `,
      [accountId]
    ),
    pool.query(
      `
        select id, payload, plan_status, created_at, updated_at
        from diet_plans
        where account_id = $1
        order by updated_at desc, id desc
        limit 1;
      `,
      [accountId]
    ),
    pool.query(
      `
        select id, payload, plan_status, created_at, updated_at
        from diet_plans
        where account_id = $1
        order by updated_at desc, id desc
        limit 8;
      `,
      [accountId]
    ),
    pool.query(
      `
        select item_id, mark, updated_at
        from food_preferences
        where account_id = $1
        order by item_id;
      `,
      [accountId]
    ),
    pool.query(
      `
        select equipment_id, available, updated_at
        from gym_equipment_preferences
        where account_id = $1
        order by equipment_id;
      `,
      [accountId]
    ),
    pool.query(
      `
        select *
        from user_goals
        where account_id = $1
        order by is_active desc, updated_at desc, id desc
        limit 12;
      `,
      [accountId]
    ),
    pool.query("select * from user_health_profiles where account_id = $1 limit 1;", [accountId]),
    pool.query("select * from user_nutrition_preferences where account_id = $1 limit 1;", [accountId]),
    pool.query(
      `
        select *
        from body_measurements
        where account_id = $1
        order by measured_at desc, id desc
        limit 24;
      `,
      [accountId]
    ),
    pool.query(
      `
        select *
        from bioimpedance_records
        where account_id = $1
        order by recorded_at desc, id desc
        limit 12;
      `,
      [accountId]
    ),
    pool.query(
      `
        select id, captured_at, angle_type, image_url, storage_key, comparison_group, notes, created_at
        from progress_photos
        where account_id = $1
        order by captured_at desc, id desc
        limit 24;
      `,
      [accountId]
    ),
    pool.query(
      `
        select plan, billing_cycle, status, token_limit, token_balance, current_period_end, updated_at
        from subscriptions
        where account_id = $1
        order by updated_at desc, id desc
        limit 1;
      `,
      [accountId]
    ),
    pool.query(
      `
        select gateway, default_payment_method_id, updated_at
        from payment_profiles
        where account_id = $1 and gateway = 'stripe'
        limit 1;
      `,
      [accountId]
    ),
    pool.query(
      `
        select personal_name, language_tone, motivation_style, feedback_depth, avatar_id, notifications, privacy, updated_at
        from user_settings
        where account_id = $1
        limit 1;
      `,
      [accountId]
    ),
  ]);

  const account = accountResult.rows[0];

  if (!account) {
    const error = new Error("Conta nao encontrada.");
    error.status = 404;
    throw error;
  }

  return {
    scope: {
      accountId: String(account.id),
      rule:
        "Este contexto pertence exclusivamente ao usuario autenticado. Nao consultar, inferir ou responder sobre outros usuarios.",
      blockedTopics: [
        "dados de outros usuarios",
        "emails de terceiros",
        "cartoes completos",
        "tokens secretos",
        "credenciais",
      ],
    },
    account,
    profile: profileResult.rows[0] || null,
    goals: compactRows(goalsResult.rows, 12),
    health: healthResult.rows[0] || null,
    nutrition: nutritionResult.rows[0] || null,
    progress: {
      measurements: compactRows(measurementsResult.rows, 24),
      bioimpedance: compactRows(bioimpedanceResult.rows, 12),
      photos: compactRows(progressPhotosResult.rows, 24),
    },
    checkins: compactRows(checkinsResult.rows, 24),
    workout: {
      activePlan: workoutPlanResult.rows[0] || null,
      recentSessions: compactRows(workoutSessionsResult.rows, 20),
    },
    diet: {
      activePlan: dietPlanResult.rows[0] || null,
      history: compactRows(dietHistoryResult.rows, 8),
    },
    preferences: {
      foods: compactRows(foodPreferencesResult.rows, 200),
      gymEquipment: compactRows(gymEquipmentResult.rows, 200),
    },
    settings: settingsResult.rows[0] || null,
    billing: {
      subscription: subscriptionResult.rows[0] || null,
      paymentProfile: sanitizePaymentProfile(paymentProfileResult.rows[0] || null),
    },
    generatedAt: new Date().toISOString(),
  };
}
