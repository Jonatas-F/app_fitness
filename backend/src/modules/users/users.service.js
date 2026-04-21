import { pool } from "../../utils/db.js";

export function toPublicProfile({ account, profile }) {
  return {
    id: String(account.id),
    email: account.email,
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    avatar_path: profile?.avatar_url || "",
    active_plan: account.plan_type || "intermediario",
    billing_cycle: account.billing_cycle || "monthly",
    google_linked: account.auth_provider === "google",
  };
}

export async function loadProfile(accountId) {
  const accountResult = await pool.query("select * from accounts where id = $1 limit 1;", [accountId]);
  const account = accountResult.rows[0];

  if (!account) {
    const error = new Error("Usuario nao encontrado.");
    error.status = 404;
    throw error;
  }

  const profileResult = await pool.query("select * from user_profiles where account_id = $1 limit 1;", [accountId]);

  return toPublicProfile({
    account,
    profile: profileResult.rows[0] || null,
  });
}

export async function saveProfile(accountId, payload) {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const accountResult = await client.query(
      `
        update accounts
        set plan_type = $2,
            billing_cycle = $3,
            updated_at = current_timestamp
        where id = $1
        returning *;
      `,
      [accountId, payload.activePlan || "intermediario", payload.billingCycle || "monthly"]
    );

    const profileResult = await client.query(
      `
        insert into user_profiles (account_id, full_name, avatar_url, updated_at)
        values ($1, $2, $3, current_timestamp)
        on conflict (account_id)
        do update set
          full_name = excluded.full_name,
          avatar_url = coalesce(excluded.avatar_url, user_profiles.avatar_url),
          updated_at = current_timestamp
        returning *;
      `,
      [accountId, payload.fullName || "", payload.avatarPath || null]
    );

    await client.query("commit");

    return toPublicProfile({
      account: accountResult.rows[0],
      profile: profileResult.rows[0],
    });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
