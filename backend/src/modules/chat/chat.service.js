import { pool } from "../../utils/db.js";

/** Limite de tokens de memória por usuário (histórico passado para a IA). */
const TOKEN_MEMORY_LIMIT = 10000;

/**
 * Estimativa simples: ~4 chars = 1 token (heurística segura para pt-BR).
 */
function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

export async function ensureLocalChatTables() {
  // Separado em queries individuais para evitar conflitos de DDL em batch no Postgres
  await pool.query(`
    create table if not exists chat_sessions (
      id          bigint generated always as identity primary key,
      account_id  bigint not null references accounts(id) on delete cascade,
      title       varchar(255) not null default 'Conversa',
      tokens_used integer not null default 0,
      created_at  timestamptz not null default now(),
      updated_at  timestamptz not null default now()
    )
  `);

  await pool.query(`
    create table if not exists chat_messages (
      id              bigint generated always as identity primary key,
      account_id      bigint not null references accounts(id) on delete cascade,
      session_id      bigint references chat_sessions(id) on delete cascade,
      role            varchar(20) not null,
      content         text not null,
      tokens_estimate integer not null default 0,
      ai_run_id       bigint references ai_generation_runs(id) on delete set null,
      created_at      timestamptz not null default now(),
      check (role in ('user', 'assistant'))
    )
  `);

  await pool.query(`
    create index if not exists idx_chat_messages_account_created
      on chat_messages (account_id, created_at)
  `);

  await pool.query(`
    create index if not exists idx_chat_sessions_account_updated
      on chat_sessions (account_id, updated_at desc)
  `);
}

async function getOrCreateActiveSession(accountId) {
  const result = await pool.query(
    `select id from chat_sessions where account_id = $1 order by updated_at desc limit 1`,
    [accountId]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  const created = await pool.query(
    `insert into chat_sessions (account_id) values ($1) returning id`,
    [accountId]
  );

  return created.rows[0].id;
}

/**
 * Carrega o histórico de mensagens do usuário, limitado a TOKEN_MEMORY_LIMIT tokens.
 * Retorna as mensagens mais recentes que cabem dentro do limite (ordem cronológica asc).
 */
export async function loadChatHistory(accountId) {
  const result = await pool.query(
    `select id, role, content, tokens_estimate, created_at
     from chat_messages
     where account_id = $1
     order by created_at asc`,
    [accountId]
  );

  const all = result.rows;

  // Percorre do fim para o início acumulando tokens até o limite
  let total = 0;
  let startIndex = all.length;

  for (let i = all.length - 1; i >= 0; i--) {
    const t = all[i].tokens_estimate || estimateTokens(all[i].content);
    total += t;
    if (total > TOKEN_MEMORY_LIMIT) break;
    startIndex = i;
  }

  return all.slice(startIndex);
}

/**
 * Persiste o par de mensagens (user + assistant) no banco.
 */
export async function saveMessagePair(accountId, { userMessage, assistantMessage, aiRunId = null }) {
  const sessionId = await getOrCreateActiveSession(accountId);

  const userTokens = estimateTokens(userMessage);
  const assistantTokens = estimateTokens(assistantMessage);

  await pool.query(
    `insert into chat_messages (account_id, session_id, role, content, tokens_estimate, ai_run_id)
     values
       ($1, $2, 'user',      $3, $4, null),
       ($1, $2, 'assistant', $5, $6, $7)`,
    [accountId, sessionId, userMessage, userTokens, assistantMessage, assistantTokens, aiRunId]
  );

  await pool.query(
    `update chat_sessions
     set tokens_used = tokens_used + $1, updated_at = now()
     where id = $2`,
    [userTokens + assistantTokens, sessionId]
  );
}
