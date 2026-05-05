import { pool } from "../../utils/db.js";

const ADMIN_EMAIL = "jonatas.freire.prof@gmail.com";

export function requireAdmin(req, res, next) {
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
