import { pool } from "../../utils/db.js";

function compactRows(rows, limit = 12) {
  return (rows || []).slice(0, limit);
}

function sanitizePaymentProfile(profile) {
  if (!profile) {
    return null;
  }

  return {
    gateway: profile.gateway,
    card_brand: profile.card_brand,
    card_last4: profile.card_last4,
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
    subscriptionResult,
    paymentProfileResult,
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
        select gateway, card_brand, card_last4, updated_at
        from payment_profiles
        where account_id = $1 and gateway = 'stripe'
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
    billing: {
      subscription: subscriptionResult.rows[0] || null,
      paymentProfile: sanitizePaymentProfile(paymentProfileResult.rows[0] || null),
    },
    generatedAt: new Date().toISOString(),
  };
}
