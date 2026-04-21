import { createPublicKey, verify as verifySignature } from "node:crypto";
import { pool } from "../../utils/db.js";

const riscConfigUrl = "https://accounts.google.com/.well-known/risc-configuration";
const criticalEventTypes = new Set([
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
]);
const accountEnabledEventType = "https://schemas.openid.net/secevent/risc/event-type/account-enabled";
const verificationEventType = "https://schemas.openid.net/secevent/risc/event-type/verification";

let cachedDiscovery = null;
let cachedJwks = null;
let cacheExpiresAt = 0;

function decodeBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url");
}

function decodeJsonPart(value) {
  return JSON.parse(decodeBase64Url(value).toString("utf8"));
}

function getAllowedAudiences() {
  return [
    process.env.GOOGLE_CLIENT_ID,
    ...(process.env.GOOGLE_RISC_CLIENT_IDS || "").split(","),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

async function loadGoogleRiscMetadata() {
  if (cachedDiscovery && cachedJwks && Date.now() < cacheExpiresAt) {
    return { discovery: cachedDiscovery, jwks: cachedJwks };
  }

  const discoveryResponse = await fetch(riscConfigUrl);

  if (!discoveryResponse.ok) {
    const error = new Error("Nao foi possivel buscar a configuracao RISC do Google.");
    error.status = 502;
    throw error;
  }

  const discovery = await discoveryResponse.json();
  const jwksResponse = await fetch(discovery.jwks_uri);

  if (!jwksResponse.ok) {
    const error = new Error("Nao foi possivel buscar as chaves publicas RISC do Google.");
    error.status = 502;
    throw error;
  }

  cachedDiscovery = discovery;
  cachedJwks = await jwksResponse.json();
  cacheExpiresAt = Date.now() + 60 * 60 * 1000;

  return { discovery: cachedDiscovery, jwks: cachedJwks };
}

function assertAudience(payload) {
  const allowedAudiences = getAllowedAudiences();
  const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (!allowedAudiences.length || !tokenAudiences.some((audience) => allowedAudiences.includes(audience))) {
    const error = new Error("Audience RISC invalida.");
    error.status = 400;
    throw error;
  }
}

function normalizeIssuer(value) {
  return String(value || "").replace(/\/$/, "");
}

export async function ensureGoogleRiscTables() {
  await pool.query(`
    create table if not exists security_events (
      id bigint generated always as identity primary key,
      source text not null,
      event_id text not null,
      account_id bigint references accounts(id) on delete set null,
      event_type text not null,
      subject_type text,
      google_subject text,
      email text,
      payload jsonb not null default '{}'::jsonb,
      action_taken text,
      received_at timestamptz not null default now(),
      unique(source, event_id, event_type)
    );

    create index if not exists idx_security_events_account_date
      on security_events (account_id, received_at desc);

    create index if not exists idx_security_events_google_subject
      on security_events (google_subject);
  `);
}

export async function validateGoogleSecurityEventToken(token) {
  const [encodedHeader, encodedPayload, encodedSignature] = String(token || "").split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    const error = new Error("Security Event Token malformado.");
    error.status = 400;
    throw error;
  }

  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    const error = new Error("Assinatura RISC invalida.");
    error.status = 400;
    throw error;
  }

  const { discovery, jwks } = await loadGoogleRiscMetadata();
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);

  if (!jwk) {
    const error = new Error("Chave publica RISC nao encontrada.");
    error.status = 400;
    throw error;
  }

  const isValid = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey({ key: jwk, format: "jwk" }),
    decodeBase64Url(encodedSignature)
  );

  if (!isValid) {
    const error = new Error("Security Event Token com assinatura invalida.");
    error.status = 400;
    throw error;
  }

  if (normalizeIssuer(payload.iss) !== normalizeIssuer(discovery.issuer)) {
    const error = new Error("Issuer RISC invalido.");
    error.status = 400;
    throw error;
  }

  assertAudience(payload);

  return payload;
}

function getEventSubject(eventPayload) {
  const subject = eventPayload?.subject || {};

  return {
    subjectType: subject.subject_type || null,
    googleSubject: subject.sub || null,
    email: subject.email || null,
  };
}

async function findAffectedAccount({ googleSubject, email }) {
  if (googleSubject) {
    const result = await pool.query("select * from accounts where google_subject = $1 limit 1;", [googleSubject]);

    if (result.rows[0]) {
      return result.rows[0];
    }
  }

  if (email) {
    const result = await pool.query("select * from accounts where email = lower($1) limit 1;", [email]);
    return result.rows[0] || null;
  }

  return null;
}

async function applySecurityAction(client, accountId, eventType) {
  if (!accountId || eventType === verificationEventType) {
    return "logged";
  }

  if (eventType === accountEnabledEventType) {
    await client.query(
      `
        update accounts
        set google_signin_disabled = false,
            account_status = 'active',
            updated_at = current_timestamp
        where id = $1;
      `,
      [accountId]
    );

    return "google_signin_enabled";
  }

  if (criticalEventTypes.has(eventType)) {
    await client.query(
      `
        update accounts
        set google_signin_disabled = true,
            account_status = 'blocked',
            auth_session_version = auth_session_version + 1,
            updated_at = current_timestamp
        where id = $1;
      `,
      [accountId]
    );

    return "sessions_revoked_and_account_flagged";
  }

  return "logged";
}

export async function processGoogleSecurityEventToken(token) {
  const payload = await validateGoogleSecurityEventToken(token);
  const eventEntries = Object.entries(payload.events || {});
  const processed = [];
  const client = await pool.connect();

  try {
    await client.query("begin");

    for (const [eventType, eventPayload] of eventEntries) {
      const subject = getEventSubject(eventPayload);
      const account = await findAffectedAccount(subject);
      const actionTaken = await applySecurityAction(client, account?.id || null, eventType);

      const result = await client.query(
        `
          insert into security_events (
            source,
            event_id,
            account_id,
            event_type,
            subject_type,
            google_subject,
            email,
            payload,
            action_taken
          )
          values ('google_risc', $1, $2, $3, $4, $5, $6, $7::jsonb, $8)
          on conflict (source, event_id, event_type)
          do update set received_at = current_timestamp
          returning *;
        `,
        [
          payload.jti,
          account?.id || null,
          eventType,
          subject.subjectType,
          subject.googleSubject,
          subject.email,
          JSON.stringify(payload),
          actionTaken,
        ]
      );

      processed.push(result.rows[0]);
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return { eventId: payload.jti, processed };
}
