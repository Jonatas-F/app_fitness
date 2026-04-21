import { pool } from "../../utils/db.js";

export async function ensureLocalPreferenceTables() {
  await pool.query(`
    create table if not exists food_preferences (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      item_id text not null,
      mark text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(account_id, item_id)
    );

    create table if not exists gym_equipment_preferences (
      id bigint generated always as identity primary key,
      account_id bigint not null references accounts(id) on delete cascade,
      equipment_id text not null,
      available boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(account_id, equipment_id)
    );
  `);
}

export async function loadFoodPreferences(accountId) {
  const result = await pool.query(
    "select item_id, mark from food_preferences where account_id = $1 order by item_id;",
    [accountId]
  );

  return Object.fromEntries(result.rows.map((row) => [row.item_id, row.mark]));
}

export async function saveFoodPreferences(accountId, preferences) {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("delete from food_preferences where account_id = $1;", [accountId]);

    for (const [itemId, mark] of Object.entries(preferences || {})) {
      await client.query(
        `
          insert into food_preferences (account_id, item_id, mark)
          values ($1, $2, $3);
        `,
        [accountId, itemId, mark]
      );
    }

    await client.query("commit");
    return loadFoodPreferences(accountId);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadGymEquipmentSelection(accountId) {
  const result = await pool.query(
    `
      select equipment_id
      from gym_equipment_preferences
      where account_id = $1
        and available = true
      order by equipment_id;
    `,
    [accountId]
  );

  return result.rows.map((row) => row.equipment_id);
}

export async function saveGymEquipmentSelection(accountId, selectedIds) {
  const ids = Array.isArray(selectedIds) ? selectedIds : [];
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("delete from gym_equipment_preferences where account_id = $1;", [accountId]);

    for (const equipmentId of ids) {
      await client.query(
        `
          insert into gym_equipment_preferences (account_id, equipment_id, available)
          values ($1, $2, true);
        `,
        [accountId, equipmentId]
      );
    }

    await client.query("commit");
    return loadGymEquipmentSelection(accountId);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
