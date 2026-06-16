import { pool } from "../../utils/db.js";

const ADMIN_EMAIL = "jonatas.freire.prof@gmail.com";

/** Planos disponíveis para atribuição manual pelo admin */
const ALLOWED_PLANS = ["basico", "intermediario", "pro", "partner", "admin"];

// REVISÃO 2026-06: créditos recalibrados para GPT-4o (ver billing.service.js / nota 05).
const PLAN_TOKEN_LIMITS = {
  basico:        350_000,
  intermediario: 900_000,
  pro:           1_600_000,
  partner:       4_500_000,
  admin:         4_500_000,
};

export function requireAdmin(req, res, next) {
  // Verifica email diretamente do payload JWT — não do body da requisição
  if (req.auth?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }
  next();
}

/** Lista todas as tabelas públicas com contagem de linhas */
export async function listTables() {
  const result = await pool.query(`
    SELECT
      t.table_name,
      (SELECT COUNT(*) FROM information_schema.columns c
       WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count,
      (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) AS row_estimate
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
  `);
  return result.rows;
}

/** Retorna colunas + dados paginados de uma tabela */
export async function getTableData(tableName, { page = 1, limit = 50, sort, order = "desc" } = {}) {
  // Valida nome da tabela contra lista real (previne SQL injection)
  const valid = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = $1;
  `, [tableName]);

  if (valid.rowCount === 0) {
    const err = new Error("Tabela não encontrada.");
    err.status = 404;
    throw err;
  }

  // Colunas da tabela
  const colResult = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position;
  `, [tableName]);
  const columns = colResult.rows;
  const colNames = columns.map((c) => c.column_name);

  // Contagem real
  const countResult = await pool.query(`SELECT COUNT(*) FROM "${tableName}";`);
  const total = Number(countResult.rows[0].count);

  // Ordenação segura
  const sortCol = colNames.includes(sort) ? sort : (colNames.includes("id") ? "id" : colNames[0]);
  const sortOrder = order === "asc" ? "ASC" : "DESC";
  const offset = (Math.max(1, Number(page)) - 1) * Math.min(200, Math.max(1, Number(limit)));
  const safeLimit = Math.min(200, Math.max(1, Number(limit)));

  const dataResult = await pool.query(
    `SELECT * FROM "${tableName}" ORDER BY "${sortCol}" ${sortOrder} LIMIT $1 OFFSET $2;`,
    [safeLimit, offset]
  );

  return {
    table: tableName,
    columns,
    rows: dataResult.rows,
    pagination: {
      page: Number(page),
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

/** Marca o onboarding de um usuário para ser resetado no próximo login */
export async function resetUserOnboarding(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const result = await pool.query(
    `update accounts
     set reset_onboarding_at = current_timestamp, updated_at = current_timestamp
     where lower(email) = $1
     returning id, email, reset_onboarding_at;`,
    [normalized]
  );
  if (result.rowCount === 0) {
    const err = new Error(`Conta não encontrada: ${email}`);
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

// ── Gerenciamento de usuários ─────────────────────────────────────────────────

/**
 * Busca usuários por e-mail (parcial, case-insensitive).
 * Retorna dados da conta + assinatura ativa + status de parceiro.
 */
export async function searchUsers(query = "") {
  const term = `%${String(query).trim().toLowerCase()}%`;
  const result = await pool.query(
    `
      SELECT
        a.id,
        a.email,
        a.plan_type,
        a.is_admin,
        a.is_partner,
        a.created_at,
        s.plan          AS sub_plan,
        s.status        AS sub_status,
        s.token_limit,
        s.token_balance,
        s.current_period_start,
        s.current_period_end,
        p.active        AS partner_active
      FROM accounts a
      LEFT JOIN LATERAL (
        SELECT plan, status, token_limit, token_balance, current_period_start, current_period_end
        FROM subscriptions
        WHERE account_id = a.id
          AND status IN ('active','trialing','past_due')
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      ) s ON true
      LEFT JOIN partners p ON lower(p.email) = lower(a.email)
      WHERE lower(a.email) LIKE $1
        AND a.email != $2
      ORDER BY a.created_at DESC
      LIMIT 30;
    `,
    [term, ADMIN_EMAIL]
  );
  return result.rows;
}

/**
 * Altera o plano de um usuário:
 * - Atualiza accounts.plan_type (e flags is_partner/is_admin)
 * - Faz upsert na tabela subscriptions com o novo plano e token_limit
 * - Para plano 'partner': garante registro na tabela partners
 * - Para rebaixamento de partner para outro plano: desativa o registro em partners
 *
 * SEGURANÇA: adminEmail vem do JWT validado (req.auth.email), não do body.
 */
export async function setUserPlan(targetEmail, newPlan, adminEmail) {
  const normalizedEmail = String(targetEmail || "").trim().toLowerCase();
  const normalizedPlan  = String(newPlan || "").trim().toLowerCase();

  if (!normalizedEmail) {
    const err = new Error("E-mail do usuário não informado.");
    err.status = 400;
    throw err;
  }
  if (!ALLOWED_PLANS.includes(normalizedPlan)) {
    const err = new Error(`Plano inválido: "${newPlan}". Valores aceitos: ${ALLOWED_PLANS.join(", ")}.`);
    err.status = 400;
    throw err;
  }
  // Impede que o admin altere o próprio plano (já é admin)
  if (normalizedEmail === String(adminEmail || "").trim().toLowerCase()) {
    const err = new Error("Não é possível alterar o plano da conta administrativa.");
    err.status = 403;
    throw err;
  }

  // Busca a conta
  const accountResult = await pool.query(
    `SELECT id, email, plan_type FROM accounts WHERE lower(email) = $1 LIMIT 1;`,
    [normalizedEmail]
  );
  if (accountResult.rowCount === 0) {
    const err = new Error(`Conta não encontrada: ${targetEmail}`);
    err.status = 404;
    throw err;
  }
  const account = accountResult.rows[0];
  const tokenLimit = PLAN_TOKEN_LIMITS[normalizedPlan];

  // 1 — Atualiza flags na tabela accounts
  const isPartner = normalizedPlan === "partner";
  const isAdmin   = normalizedPlan === "admin";
  await pool.query(
    `UPDATE accounts
     SET plan_type   = $2,
         is_partner  = $3,
         is_admin    = $4,
         updated_at  = now()
     WHERE id = $1;`,
    [account.id, normalizedPlan, isPartner, isAdmin]
  );

  // 2 — Upsert na tabela subscriptions
  const gatewayId = isPartner
    ? `partner:${account.id}`
    : `manual:${account.id}`;

  await pool.query(
    `
      INSERT INTO subscriptions (
        account_id, plan, billing_cycle, status, token_limit, token_balance,
        current_period_start, current_period_end, gateway_subscription_id
      )
      VALUES ($1, $2, 'monthly', 'active', $3, $3,
              date_trunc('month', now()),
              date_trunc('month', now()) + interval '1 month',
              $4)
      ON CONFLICT (gateway_subscription_id) DO UPDATE SET
        plan                 = EXCLUDED.plan,
        status               = 'active',
        token_limit          = $3,
        token_balance        = $3,
        current_period_start = date_trunc('month', now()),
        current_period_end   = date_trunc('month', now()) + interval '1 month',
        updated_at           = now();
    `,
    [account.id, normalizedPlan, tokenLimit, gatewayId]
  );

  // 3 — Gerencia tabela partners
  if (isPartner) {
    await pool.query(
      `INSERT INTO partners (email, active)
       VALUES ($1, true)
       ON CONFLICT (email) DO UPDATE SET active = true, updated_at = now();`,
      [normalizedEmail]
    );
  } else {
    // Se estava como partner e mudou de plano, desativa o registro
    await pool.query(
      `UPDATE partners SET active = false, updated_at = now() WHERE lower(email) = $1;`,
      [normalizedEmail]
    );
  }

  console.log(`[admin] ${adminEmail} alterou plano de ${targetEmail}: ${account.plan_type} → ${normalizedPlan}`);

  return {
    email:    account.email,
    oldPlan:  account.plan_type,
    newPlan:  normalizedPlan,
    tokenLimit,
  };
}

/**
 * Reseta dados de um usuário de forma seletiva.
 * options.checkins   → apaga check-ins
 * options.workouts   → apaga planos de treino e sessões
 * options.diet       → apaga planos de dieta e registros de refeição
 * options.chat       → apaga histórico de chat e runs de IA
 * options.settings   → reseta configurações para o padrão
 * options.onboarding → força re-onboarding no próximo login
 *
 * SEGURANÇA: adminEmail vem do JWT validado, não do body.
 */
export async function resetUserData(targetEmail, options = {}, adminEmail) {
  const normalizedEmail = String(targetEmail || "").trim().toLowerCase();

  if (!normalizedEmail) {
    const err = new Error("E-mail do usuário não informado.");
    err.status = 400;
    throw err;
  }
  if (normalizedEmail === String(adminEmail || "").trim().toLowerCase()) {
    const err = new Error("Não é possível resetar a conta administrativa.");
    err.status = 403;
    throw err;
  }

  const accountResult = await pool.query(
    `SELECT id, email FROM accounts WHERE lower(email) = $1 LIMIT 1;`,
    [normalizedEmail]
  );
  if (accountResult.rowCount === 0) {
    const err = new Error(`Conta não encontrada: ${targetEmail}`);
    err.status = 404;
    throw err;
  }
  const { id: accountId, email } = accountResult.rows[0];
  const cleared = [];

  if (options.checkins) {
    await pool.query(`DELETE FROM checkins WHERE account_id = $1;`, [accountId]);
    cleared.push("checkins");
  }
  if (options.workouts) {
    await pool.query(`DELETE FROM workout_sessions WHERE account_id = $1;`, [accountId]);
    await pool.query(`DELETE FROM workout_plans WHERE account_id = $1;`, [accountId]);
    cleared.push("workout_plans", "workout_sessions");
  }
  if (options.diet) {
    await pool.query(`DELETE FROM diet_meal_logs WHERE account_id = $1;`, [accountId]);
    await pool.query(`DELETE FROM diet_plans WHERE account_id = $1;`, [accountId]);
    cleared.push("diet_plans", "diet_meal_logs");
  }
  if (options.chat) {
    await pool.query(`DELETE FROM chat_messages WHERE account_id = $1;`, [accountId]);
    await pool.query(`DELETE FROM ai_generation_runs WHERE account_id = $1;`, [accountId]);
    cleared.push("chat_messages", "ai_generation_runs");
  }
  if (options.settings) {
    await pool.query(`DELETE FROM user_settings WHERE account_id = $1;`, [accountId]);
    cleared.push("user_settings");
  }
  if (options.onboarding) {
    await pool.query(
      `UPDATE accounts
       SET reset_onboarding_at = now(), updated_at = now()
       WHERE id = $1;`,
      [accountId]
    );
    cleared.push("onboarding_flag");
  }

  console.log(`[admin] ${adminEmail} resetou dados de ${email}: [${cleared.join(", ")}]`);

  return { email, cleared };
}

/** Executa uma query SQL arbitrária (somente SELECT) */
export async function runQuery(sql) {
  const clean = sql.trim().toLowerCase();
  if (!clean.startsWith("select") && !clean.startsWith("with")) {
    const err = new Error("Apenas queries SELECT são permitidas.");
    err.status = 400;
    throw err;
  }
  const result = await pool.query(sql);
  return {
    rows: result.rows,
    rowCount: result.rowCount,
    fields: result.fields?.map((f) => f.name) ?? [],
  };
}
