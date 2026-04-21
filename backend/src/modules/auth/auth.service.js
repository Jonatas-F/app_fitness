import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { pool } from "../../utils/db.js";

const tokenSecret = process.env.JWT_SECRET || "shape_certo_dev_secret";
const tokenTtlSeconds = 60 * 60 * 24 * 7;

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(payload) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", tokenSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || "").split("$");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const passwordHash = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const stored = Buffer.from(hash, "hex");

  return stored.length === passwordHash.length && timingSafeEqual(stored, passwordHash);
}

export function toAuthResponse(account, profile = null) {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: String(account.id),
    email: account.email,
    user_metadata: {
      full_name: profile?.full_name || "",
    },
    app_metadata: {
      provider: account.auth_provider || "email",
    },
  };
  const token = signPayload({
    sub: String(account.id),
    email: account.email,
    iat: now,
    exp: now + tokenTtlSeconds,
  });

  return {
    user,
    session: {
      access_token: token,
      token_type: "Bearer",
      expires_in: tokenTtlSeconds,
    },
  };
}

export function verifyToken(token) {
  const [header, body, signature] = String(token || "").split(".");

  if (!header || !body || !signature) {
    throw new Error("Token malformado.");
  }

  const expectedSignature = createHmac("sha256", tokenSecret)
    .update(`${header}.${body}`)
    .digest("base64url");

  if (signature !== expectedSignature) {
    throw new Error("Assinatura invalida.");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expirado.");
  }

  return payload;
}

export async function ensureLocalAuthColumns() {
  await pool.query(`
    alter table accounts
      add column if not exists billing_cycle varchar(20) not null default 'monthly';
  `);
}

export async function signUpWithEmail({ email, password, fullName, plan }) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password || password.length < 8) {
    const error = new Error("Informe email e senha com pelo menos 8 caracteres.");
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    const accountResult = await client.query(
      `
        insert into accounts (email, password_hash, auth_provider, account_status, plan_type)
        values ($1, $2, 'email', 'active', $3)
        returning *;
      `,
      [normalizedEmail, hashPassword(password), plan || "intermediario"]
    );
    const account = accountResult.rows[0];
    const profileResult = await client.query(
      `
        insert into user_profiles (account_id, full_name)
        values ($1, $2)
        returning *;
      `,
      [account.id, fullName || ""]
    );

    await client.query("commit");
    return toAuthResponse(account, profileResult.rows[0]);
  } catch (error) {
    await client.query("rollback");

    if (error.code === "23505") {
      error.status = 409;
      error.message = "Este email ja esta cadastrado.";
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function signInWithEmail({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const result = await pool.query("select * from accounts where email = $1 limit 1;", [normalizedEmail]);
  const account = result.rows[0];

  if (!account || !verifyPassword(password, account.password_hash)) {
    const error = new Error("Email ou senha invalidos.");
    error.status = 401;
    throw error;
  }

  await pool.query("update accounts set last_login_at = current_timestamp where id = $1;", [account.id]);

  const profileResult = await pool.query("select * from user_profiles where account_id = $1 limit 1;", [account.id]);

  return toAuthResponse(account, profileResult.rows[0] || null);
}

export async function signInWithGoogleProfile(profile) {
  const email = normalizeEmail(profile.email);

  if (!email) {
    const error = new Error("Google nao retornou email para esta conta.");
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    const existing = await client.query("select * from accounts where email = $1 limit 1;", [email]);
    let account = existing.rows[0];

    if (account) {
      const updated = await client.query(
        `
          update accounts
          set auth_provider = 'google',
              account_status = 'active',
              last_login_at = current_timestamp,
              updated_at = current_timestamp
          where id = $1
          returning *;
        `,
        [account.id]
      );
      account = updated.rows[0];
    } else {
      const created = await client.query(
        `
          insert into accounts (email, auth_provider, account_status, plan_type, last_login_at)
          values ($1, 'google', 'active', 'intermediario', current_timestamp)
          returning *;
        `,
        [email]
      );
      account = created.rows[0];
    }

    const profileResult = await client.query(
      `
        insert into user_profiles (account_id, full_name, avatar_url)
        values ($1, $2, $3)
        on conflict (account_id)
        do update set
          full_name = coalesce(nullif(excluded.full_name, ''), user_profiles.full_name),
          avatar_url = coalesce(excluded.avatar_url, user_profiles.avatar_url),
          updated_at = current_timestamp
        returning *;
      `,
      [account.id, profile.name || "", profile.picture || null]
    );

    await client.query("commit");
    return toAuthResponse(account, profileResult.rows[0] || null);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getCurrentUser(accountId) {
  const result = await pool.query("select * from accounts where id = $1 limit 1;", [accountId]);
  const account = result.rows[0];

  if (!account) {
    const error = new Error("Usuario nao encontrado.");
    error.status = 404;
    throw error;
  }

  const profileResult = await pool.query("select * from user_profiles where account_id = $1 limit 1;", [account.id]);

  return {
    user: toAuthResponse(account, profileResult.rows[0] || null).user,
    profile: profileResult.rows[0] || null,
    account,
  };
}
