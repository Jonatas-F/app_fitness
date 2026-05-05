import { listTables, getTableData, runQuery } from "./admin.service.js";

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
