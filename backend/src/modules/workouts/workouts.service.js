import { pool } from "../../utils/db.js";

export async function ensureLocalWorkoutTables() {
  await pool.query(`
    create table if not exists training_plans (
      id               bigserial primary key,
      account_id       bigint not null references accounts(id) on delete cascade,
      title            text not null default '',
      weekly_frequency integer not null default 3,
      generated_by     varchar(30) not null default 'manual',
      plan_status      varchar(20) not null default 'active',
      valid_from       date,
      valid_until      date,
      payload          jsonb not null default '{}'::jsonb,
      created_at       timestamptz not null default current_timestamp,
      updated_at       timestamptz not null default current_timestamp
    );

    alter table training_plans
      add column if not exists payload jsonb not null default '{}'::jsonb;

    create table if not exists workout_sessions (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      training_plan_id bigint references training_plans(id) on delete set null,
      workout_id text not null,
      workout_title text not null,
      payload jsonb not null default '{}'::jsonb,
      started_at timestamptz,
      performed_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );

    create index if not exists idx_workout_sessions_account_date
      on workout_sessions (account_id, performed_at desc);

    create index if not exists idx_workout_sessions_account_workout
      on workout_sessions (account_id, workout_id, performed_at desc);
  `);
}

function toWorkoutProtocol(row) {
  return {
    id: String(row.id),
    title: row.title,
    status: row.plan_status,
    payload: row.payload || {},
    starts_on: row.valid_from,
    ends_on: row.valid_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toWorkoutSession(row) {
  const payload = row.payload || {};

  return {
    id: String(row.id),
    workoutId: row.workout_id,
    workoutTitle: row.workout_title,
    startedAt: row.started_at || payload.startedAt,
    createdAt: row.performed_at || row.created_at,
    exercises: payload.exercises || [],
  };
}

export async function loadActiveWorkoutPlan(accountId) {
  const result = await pool.query(
    `
      select *
      from training_plans
      where account_id = $1
        and plan_status = 'active'
      order by updated_at desc, id desc
      limit 1;
    `,
    [accountId]
  );

  return result.rows[0] ? toWorkoutProtocol(result.rows[0]) : null;
}

export async function saveWorkoutPlan(accountId, plan) {
  const existing = await pool.query(
    `
      select id
      from training_plans
      where account_id = $1
        and plan_status = 'active'
      order by updated_at desc, id desc
      limit 1;
    `,
    [accountId]
  );

  const payload = JSON.stringify(plan || {});
  const title = plan?.split ? `Protocolo ${plan.split}` : "Protocolo de treino";
  const weeklyFrequency = Number(plan?.weeklyTrainingDays || 0) || null;

  const result = existing.rows[0]
    ? await pool.query(
        `
          update training_plans
          set title = $2,
              weekly_frequency = $3,
              payload = $4::jsonb,
              updated_at = current_timestamp
          where id = $1
            and account_id = $5
          returning *;
        `,
        [existing.rows[0].id, title, weeklyFrequency, payload, accountId]
      )
    : await pool.query(
        `
          insert into training_plans (
            account_id,
            title,
            weekly_frequency,
            generated_by,
            plan_status,
            payload
          )
          values ($1, $2, $3, 'manual', 'active', $4::jsonb)
          returning *;
        `,
        [accountId, title, weeklyFrequency, payload]
      );

  return toWorkoutProtocol(result.rows[0]);
}

export async function listWorkoutHistory(accountId) {
  const result = await pool.query(
    `
      select *
      from training_plans
      where account_id = $1
        and plan_status = 'archived'
      order by updated_at desc, id desc
      limit 20;
    `,
    [accountId]
  );

  return result.rows.map(toWorkoutProtocol);
}

export async function restoreWorkoutPlan(accountId, planId) {
  // Arquiva o plano ativo atual
  await pool.query(
    `
      update training_plans
      set plan_status = 'archived',
          updated_at = current_timestamp
      where account_id = $1
        and plan_status = 'active';
    `,
    [accountId]
  );

  // Reativa o plano escolhido
  const result = await pool.query(
    `
      update training_plans
      set plan_status = 'active',
          updated_at = current_timestamp
      where id = $1
        and account_id = $2
      returning *;
    `,
    [planId, accountId]
  );

  if (!result.rows[0]) {
    const error = new Error("Protocolo de treino nao encontrado.");
    error.status = 404;
    throw error;
  }

  return toWorkoutProtocol(result.rows[0]);
}

export async function listWorkoutSessions(accountId) {
  const result = await pool.query(
    `
      select *
      from workout_sessions
      where account_id = $1
      order by performed_at desc, id desc;
    `,
    [accountId]
  );

  return result.rows.map(toWorkoutSession);
}

export async function saveWorkoutSession(accountId, session) {
  const activePlan = await loadActiveWorkoutPlan(accountId);
  const payload = JSON.stringify({
    ...session,
    id: undefined,
  });
  const result = await pool.query(
    `
      insert into workout_sessions (
        account_id,
        training_plan_id,
        workout_id,
        workout_title,
        payload,
        started_at,
        performed_at
      )
      values ($1, $2, $3, $4, $5::jsonb, $6, $7)
      returning *;
    `,
    [
      accountId,
      activePlan?.id || null,
      session.workoutId,
      session.workoutTitle,
      payload,
      session.startedAt || null,
      session.createdAt || new Date().toISOString(),
    ]
  );

  return toWorkoutSession(result.rows[0]);
}
