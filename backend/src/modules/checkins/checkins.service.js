import { pool } from "../../utils/db.js";

export async function ensureLocalCheckinColumns() {
  await pool.query(`
    create table if not exists checkins (
      id                       bigserial primary key,
      account_id               bigint not null references accounts(id) on delete cascade,
      checkin_date             date not null,
      weight_kg                decimal(6,2),
      energy_score             integer,
      sleep_score              integer,
      mood_score               integer,
      stress_score             integer,
      workout_adherence_pct    integer,
      observations             text,
      cadence                  varchar(20) not null default 'monthly',
      status                   varchar(20) not null default 'completed',
      payload                  jsonb not null default '{}'::jsonb,
      ai_context               jsonb not null default '{}'::jsonb,
      created_at               timestamptz not null default current_timestamp,
      updated_at               timestamptz not null default current_timestamp
    );

    alter table checkins
      add column if not exists cadence varchar(20) not null default 'monthly',
      add column if not exists status varchar(20) not null default 'completed',
      add column if not exists payload jsonb not null default '{}'::jsonb,
      add column if not exists ai_context jsonb not null default '{}'::jsonb;

    alter table checkins
      drop constraint if exists checkins_energy_score_check,
      drop constraint if exists checkins_sleep_score_check,
      drop constraint if exists checkins_mood_score_check,
      drop constraint if exists checkins_stress_score_check;

    alter table checkins
      add constraint checkins_energy_score_check check (energy_score between 0 and 10 or energy_score is null),
      add constraint checkins_sleep_score_check check (sleep_score between 0 and 24 or sleep_score is null),
      add constraint checkins_mood_score_check check (mood_score between 0 and 10 or mood_score is null),
      add constraint checkins_stress_score_check check (stress_score between 0 and 10 or stress_score is null);
  `);
}

function numberOrNull(value) {
  const parsed = Number(String(value || "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getCheckinDate(checkin) {
  const createdAt = checkin.createdAt || new Date().toISOString();
  return createdAt.slice(0, 10);
}

function stripTransientPhotoData(checkin) {
  const payload = { ...checkin };
  delete payload.aiContext;

  if (Array.isArray(payload.photos)) {
    payload.photos = payload.photos.map(({ file, previewUrl, dataUrl, ...photo }) => photo);
  }

  return payload;
}

function toApiCheckin(row) {
  return {
    id: String(row.id),
    user_id: String(row.account_id),
    cadence: row.cadence,
    status: row.status,
    checkin_date: row.checkin_date,
    payload: row.payload || {},
    ai_context: row.ai_context || {},
    checkin_files: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listCheckins(accountId) {
  const result = await pool.query(
    `
      select *
      from checkins
      where account_id = $1
      order by created_at desc, id desc;
    `,
    [accountId]
  );

  return result.rows.map(toApiCheckin);
}

export async function saveCheckin(accountId, checkin) {
  const checkinDate = getCheckinDate(checkin);
  const cadence = checkin.cadence || "monthly";
  const payload = stripTransientPhotoData(checkin);
  const aiContext = checkin.aiContext || {};
  const createdAt = checkin.createdAt || new Date().toISOString();

  const existing = await pool.query(
    `
      select id
      from checkins
      where account_id = $1
        and cadence = $2
        and checkin_date = $3
      limit 1;
    `,
    [accountId, cadence, checkinDate]
  );

  const values = [
    accountId,
    checkinDate,
    numberOrNull(checkin.weight),
    numberOrNull(checkin.energy),
    numberOrNull(checkin.sleep),
    numberOrNull(checkin.adherence),
    checkin.comments || checkin.weeklyNotes || checkin.observations || null,
    cadence,
    checkin.status || "completed",
    JSON.stringify(payload),
    JSON.stringify(aiContext),
    createdAt,
  ];

  const query = existing.rows[0]
    ? {
        text: `
          update checkins
          set checkin_date = $2,
              weight_kg = $3,
              energy_score = $4,
              sleep_score = $5,
              workout_adherence_pct = $6,
              observations = $7,
              cadence = $8,
              status = $9,
              payload = $10::jsonb,
              ai_context = $11::jsonb,
              updated_at = current_timestamp
          where id = $13
            and account_id = $1
          returning *;
        `,
        values: [...values, existing.rows[0].id],
      }
    : {
        text: `
          insert into checkins (
            account_id,
            checkin_date,
            weight_kg,
            energy_score,
            sleep_score,
            workout_adherence_pct,
            observations,
            cadence,
            status,
            payload,
            ai_context,
            created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::timestamptz)
          returning *;
        `,
        values,
      };

  const result = await pool.query(query.text, query.values);

  return toApiCheckin(result.rows[0]);
}

export async function deleteCheckins(accountId) {
  await pool.query("delete from checkins where account_id = $1;", [accountId]);
}
