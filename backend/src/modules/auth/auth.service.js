import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { pool } from "../../utils/db.js";

const tokenSecret = process.env.JWT_SECRET || "shape_certo_dev_secret";
const tokenTtlSeconds = 60 * 60 * 24 * 7;

/** Contas com acesso irrestrito: mapeadas para o plan_type garantido no login. */
const BYPASS_ACCOUNTS = {
  "jonatas.freire.prof@gmail.com": "pro",
  "fmagranero@gmail.com":          "pro",
};

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

/** Retorna true se o usuário tiver assinatura ativa no Stripe. */
async function hasActivePlan(accountId) {
  const result = await pool.query(
    `select 1 from subscriptions
     where account_id = $1
       and gateway_subscription_id is not null
       and status in ('active','trialing')
     limit 1;`,
    [accountId]
  );
  return result.rowCount > 0;
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
    sv: Number(account.auth_session_version || 1),
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
    create table if not exists accounts (
      id              bigserial primary key,
      email           varchar(255) unique not null,
      password_hash   text,
      auth_provider   varchar(20)  not null default 'email',
      account_status  varchar(20)  not null default 'active',
      plan_type       varchar(50)  not null default 'intermediario',
      billing_cycle   varchar(20)  not null default 'monthly',
      google_subject  text,
      google_signin_disabled  boolean not null default false,
      auth_session_version    integer not null default 1,
      last_login_at   timestamptz,
      created_at      timestamptz not null default current_timestamp,
      updated_at      timestamptz not null default current_timestamp
    );

    create table if not exists user_profiles (
      id          bigserial primary key,
      account_id  bigint not null references accounts(id) on delete cascade,
      full_name   text not null default '',
      avatar_url  text,
      phone       text,
      city        text,
      state       text,
      birth_date  date,
      gym_name    text,
      created_at  timestamptz not null default current_timestamp,
      updated_at  timestamptz not null default current_timestamp
    );

    alter table accounts
      add column if not exists billing_cycle varchar(20) not null default 'monthly';

    alter table accounts
      add column if not exists google_subject text,
      add column if not exists google_signin_disabled boolean not null default false,
      add column if not exists auth_session_version integer not null default 1;

    alter table accounts
      add column if not exists is_partner boolean not null default false;

    create unique index if not exists idx_accounts_google_subject
      on accounts (google_subject)
      where google_subject is not null;
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
    return { ...toAuthResponse(account, profileResult.rows[0]), has_active_plan: false, is_new: true };
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

  if (account.account_status === "blocked") {
    const error = new Error("Conta em revisao de seguranca. Redefina o acesso antes de continuar.");
    error.status = 403;
    throw error;
  }

  const bypassPlan = BYPASS_ACCOUNTS[account.email];

  // Garante plan_type correto para contas bypass e atualiza last_login_at
  if (bypassPlan && account.plan_type !== bypassPlan) {
    await pool.query(
      "update accounts set plan_type = $1, last_login_at = current_timestamp where id = $2;",
      [bypassPlan, account.id]
    );
    account.plan_type = bypassPlan;
  } else {
    await pool.query("update accounts set last_login_at = current_timestamp where id = $1;", [account.id]);
  }

  const profileResult = await pool.query("select * from user_profiles where account_id = $1 limit 1;", [account.id]);
  const activePlan = bypassPlan ? true : await hasActivePlan(account.id);

  return { ...toAuthResponse(account, profileResult.rows[0] || null), has_active_plan: activePlan };
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
    let isNewAccount = false;

    if (account) {
      if (account.google_signin_disabled || account.account_status === "blocked") {
        const error = new Error("Login com Google temporariamente bloqueado por protecao da conta.");
        error.status = 403;
        throw error;
      }

      const updated = await client.query(
        `
          update accounts
          set auth_provider = 'google',
              google_subject = coalesce($2, google_subject),
              account_status = 'active',
              last_login_at = current_timestamp,
              updated_at = current_timestamp
          where id = $1
          returning *;
        `,
        [account.id, profile.sub || null]
      );
      account = updated.rows[0];
    } else {
      const created = await client.query(
        `
          insert into accounts (email, auth_provider, google_subject, account_status, plan_type, last_login_at)
          values ($1, 'google', $2, 'active', 'intermediario', current_timestamp)
          returning *;
        `,
        [email, profile.sub || null]
      );
      account = created.rows[0];
      isNewAccount = true;
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

    // Garante plan_type correto para contas bypass (Google login)
    const bypassPlan = BYPASS_ACCOUNTS[email];
    if (bypassPlan && account.plan_type !== bypassPlan) {
      await client.query(
        "update accounts set plan_type = $1 where id = $2;",
        [bypassPlan, account.id]
      );
      account.plan_type = bypassPlan;
    }

    await client.query("commit");
    const activePlan = bypassPlan ? true : (isNewAccount ? false : await hasActivePlan(account.id));
    return { ...toAuthResponse(account, profileResult.rows[0] || null), is_new: isNewAccount && !bypassPlan, has_active_plan: activePlan };
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

export async function validateAuthSession(payload) {
  const result = await pool.query(
    `
      select id, account_status, auth_session_version
      from accounts
      where id = $1
      limit 1;
    `,
    [payload.sub]
  );
  const account = result.rows[0];

  if (!account) {
    throw new Error("Usuario nao encontrado.");
  }

  if (account.account_status === "blocked") {
    throw new Error("Conta em revisao de seguranca.");
  }

  if (Number(payload.sv || 1) !== Number(account.auth_session_version || 1)) {
    throw new Error("Sessao revogada.");
  }

  return payload;
}
