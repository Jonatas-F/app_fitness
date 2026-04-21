import { pool } from "../../utils/db.js";

export async function ensureLocalDietTables() {
  await pool.query(`
    alter table diet_plans
      add column if not exists payload jsonb not null default '{}'::jsonb;
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
