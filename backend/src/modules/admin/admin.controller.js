import { listTables, getTableData, runQuery, resetUserOnboarding, searchUsers, setUserPlan, resetUserData } from "./admin.service.js";

export async function handleListTables(req, res, next) {
  try {
    const tables = await listTables();
    res.json({ tables });
  } catch (error) {
    next(error);
  }
}

export async function handleGetTableData(req, res, next) {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 50, sort, order = "desc" } = req.query;
    const data = await getTableData(tableName, { page, limit, sort, order });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleResetUserOnboarding(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Informe o email." });
    const result = await resetUserOnboarding(email);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function handleSearchUsers(req, res, next) {
  try {
    const { q = "" } = req.query;
    const users = await searchUsers(q);
    res.json({ users });
  } catch (error) {
    next(error);
  }
}

export async function handleSetUserPlan(req, res, next) {
  try {
    const { email, plan } = req.body;
    if (!email || !plan) return res.status(400).json({ error: "Informe email e plan." });
    // adminEmail vem do JWT validado — nunca do body
    const result = await setUserPlan(email, plan, req.auth.email);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function handleResetUserData(req, res, next) {
  try {
    const { email, options } = req.body;
    if (!email) return res.status(400).json({ error: "Informe o email." });
    if (!options || typeof options !== "object") {
      return res.status(400).json({ error: "Informe as opções de reset (objeto)." });
    }
    const result = await resetUserData(email, options, req.auth.email);
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function handleRunQuery(req, res, next) {
  try {
    const { sql } = req.body;
    if (!sql || !String(sql).trim()) {
      return res.status(400).json({ error: "SQL não informado." });
    }
    const result = await runQuery(String(sql).trim());
    res.json(result);
  } catch (error) {
    // Retorna 400 para expor a mensagem real do erro SQL (não mascarada pelo errorHandler)
    const msg = error.message || "Erro ao executar query.";
    return res.status(400).json({ error: msg });
  }
}
