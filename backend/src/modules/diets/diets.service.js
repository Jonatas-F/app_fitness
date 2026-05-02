import { pool } from "../../utils/db.js";

export async function ensureLocalDietTables() {
  await pool.query(`
    create table if not exists diet_plans (
      id                          bigserial primary key,
      account_id                  bigint not null references accounts(id) on delete cascade,
      title                       text not null default '',
      objective_summary           text,
      valid_from                  date,
      valid_until                 date,
      generated_by                varchar(30) not null default 'manual',
      plan_status                 varchar(20) not null default 'active',
      checkin_id                  bigint references checkins(id) on delete set null,
      variation_level             varchar(20),
      meal_count_available        smallint,
      source_preferences_snapshot jsonb not null default '{}'::jsonb,
      ai_context                  jsonb not null default '{}'::jsonb,
      payload                     jsonb not null default '{}'::jsonb,
      created_at                  timestamptz not null default current_timestamp,
      updated_at                  timestamptz not null default current_timestamp
    );

    create table if not exists diet_meals (
      id                  bigserial primary key,
      diet_plan_id        bigint not null references diet_plans(id) on delete cascade,
      name                text not null default '',
      order_index         smallint not null default 0,
      day_id              varchar(30),
      slot_id             varchar(60),
      enabled             boolean not null default true,
      meal_status         varchar(20) not null default 'active',
      water_target_liters decimal(4,2),
      payload             jsonb not null default '{}'::jsonb,
      created_at          timestamptz not null default current_timestamp,
      updated_at          timestamptz not null default current_timestamp
    );

    create table if not exists diet_meal_items (
      id                      bigserial primary key,
      diet_meal_id            bigint not null references diet_meals(id) on delete cascade,
      name                    text not null default '',
      order_index             smallint not null default 0,
      food_preference_item_id text,
      preference_mark         text,
      meal_item_status        varchar(20) not null default 'active',
      payload                 jsonb not null default '{}'::jsonb,
      created_at              timestamptz not null default current_timestamp,
      updated_at              timestamptz not null default current_timestamp
    );

    alter table diet_plans
      add column if not exists checkin_id bigint references checkins(id) on delete set null,
      add column if not exists variation_level varchar(20),
      add column if not exists meal_count_available smallint,
      add column if not exists source_preferences_snapshot jsonb not null default '{}'::jsonb,
      add column if not exists ai_context jsonb not null default '{}'::jsonb,
      add column if not exists payload jsonb not null default '{}'::jsonb;

    alter table diet_meals
      add column if not exists day_id varchar(30),
      add column if not exists slot_id varchar(60),
      add column if not exists enabled boolean not null default true,
      add column if not exists meal_status varchar(20) not null default 'active',
      add column if not exists water_target_liters decimal(4,2);

    alter table diet_meal_items
      add column if not exists food_preference_item_id text,
      add column if not exists preference_mark text,
      add column if not exists order_index smallint not null default 0,
      add column if not exists meal_item_status varchar(20) not null default 'active';

    create index if not exists idx_diet_plans_account_checkin
      on diet_plans (account_id, checkin_id);

    create index if not exists idx_diet_meals_plan_day
      on diet_meals (diet_plan_id, day_id, order_index);

    create index if not exists idx_diet_meal_items_meal_order
      on diet_meal_items (diet_meal_id, order_index);

    create index if not exists idx_diet_meal_items_food_preference
      on diet_meal_items (food_preference_item_id);

    create table if not exists diet_meal_logs (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      diet_plan_id bigint references diet_plans(id) on delete set null,
      diet_meal_id bigint references diet_meals(id) on delete set null,
      day_id varchar(30) not null,
      slot_id varchar(60) not null,
      meal_name varchar(120) not null,
      log_date date not null,
      scheduled_at timestamptz,
      performed_at timestamptz,
      log_status varchar(30) not null default 'completed',
      source varchar(30) not null default 'manual',
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(account_id, diet_plan_id, day_id, slot_id, log_date)
    );

    create index if not exists idx_diet_meal_logs_account_date
      on diet_meal_logs (account_id, log_date desc);

    create index if not exists idx_diet_meal_logs_plan_date
      on diet_meal_logs (diet_plan_id, log_date desc);
  `);
}

function toDietProtocol(row) {
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

export async function loadActiveDietPlan(accountId) {
  const result = await pool.query(
    `
      select *
      from diet_plans
      where account_id = $1
        and plan_status = 'active'
      order by updated_at desc, id desc
      limit 1;
    `,
    [accountId]
  );

  return result.rows[0] ? toDietProtocol(result.rows[0]) : null;
}

export async function saveDietPlan(accountId, protocol) {
  const existing = await pool.query(
    `
      select id
      from diet_plans
      where account_id = $1
        and plan_status = 'active'
      order by updated_at desc, id desc
      limit 1;
    `,
    [accountId]
  );

  const payload = JSON.stringify(protocol || {});
  const title = protocol?.title || "Plano alimentar atual";
  const result = existing.rows[0]
    ? await pool.query(
        `
          update diet_plans
          set title = $2,
              objective_summary = $3,
              valid_from = nullif($4, '')::date,
              valid_until = nullif($5, '')::date,
              payload = $6::jsonb,
              updated_at = current_timestamp
          where id = $1
            and account_id = $7
          returning *;
        `,
        [
          existing.rows[0].id,
          title,
          protocol?.nutritionalGoal || null,
          protocol?.startDate || "",
          protocol?.endDate || "",
          payload,
          accountId,
        ]
      )
    : await pool.query(
        `
          insert into diet_plans (
            account_id,
            title,
            objective_summary,
            valid_from,
            valid_until,
            generated_by,
            plan_status,
            payload
          )
          values ($1, $2, $3, nullif($4, '')::date, nullif($5, '')::date, 'manual', 'active', $6::jsonb)
          returning *;
        `,
        [
          accountId,
          title,
          protocol?.nutritionalGoal || null,
          protocol?.startDate || "",
          protocol?.endDate || "",
          payload,
        ]
      );

  return toDietProtocol(result.rows[0]);
}

export async function listDietHistory(accountId) {
  const result = await pool.query(
    `
      select *
      from diet_plans
      where account_id = $1
        and plan_status = 'archived'
      order by updated_at desc, id desc;
    `,
    [accountId]
  );

  return result.rows.map(toDietProtocol);
}

function toMealLog(row) {
  const logDate =
    row.log_date instanceof Date
      ? row.log_date.toISOString().slice(0, 10)
      : String(row.log_date || "").slice(0, 10);

  return {
    id: String(row.id),
    dietPlanId: row.diet_plan_id ? String(row.diet_plan_id) : null,
    dietMealId: row.diet_meal_id ? String(row.diet_meal_id) : null,
    dayId: row.day_id,
    slotId: row.slot_id,
    mealName: row.meal_name,
    logDate,
    scheduledAt: row.scheduled_at,
    performedAt: row.performed_at,
    status: row.log_status,
    source: row.source,
    payload: row.payload || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDietMealLogs(accountId) {
  const result = await pool.query(
    `
      select *
      from diet_meal_logs
      where account_id = $1
      order by log_date desc, coalesce(performed_at, scheduled_at, created_at) desc, id desc;
    `,
    [accountId]
  );

  return result.rows.map(toMealLog);
}

export async function saveDietMealLog(accountId, mealLog) {
  const activePlan = await loadActiveDietPlan(accountId);
  const payload = JSON.stringify(mealLog?.payload || {});
  const result = await pool.query(
    `
      insert into diet_meal_logs (
        account_id,
        diet_plan_id,
        diet_meal_id,
        day_id,
        slot_id,
        meal_name,
        log_date,
        scheduled_at,
        performed_at,
        log_status,
        source,
        payload
      )
      values (
        $1, $2, nullif($3, '')::bigint, $4, $5, $6, $7::date,
        nullif($8, '')::timestamptz,
        nullif($9, '')::timestamptz,
        $10, $11, $12::jsonb
      )
      on conflict (account_id, diet_plan_id, day_id, slot_id, log_date)
      do update set
        diet_meal_id = excluded.diet_meal_id,
        meal_name = excluded.meal_name,
        scheduled_at = excluded.scheduled_at,
        performed_at = excluded.performed_at,
        log_status = excluded.log_status,
        source = excluded.source,
        payload = excluded.payload,
        updated_at = now()
      returning *;
    `,
    [
      accountId,
      activePlan?.id || mealLog?.dietPlanId || null,
      mealLog?.dietMealId || "",
      mealLog?.dayId,
      mealLog?.slotId,
      mealLog?.mealName,
      mealLog?.logDate || new Date().toISOString().slice(0, 10),
      mealLog?.scheduledAt || "",
      mealLog?.performedAt || new Date().toISOString(),
      mealLog?.status || "completed",
      mealLog?.source || "manual",
      payload,
    ]
  );

  return toMealLog(result.rows[0]);
}
