import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { getStoredApiUser, apiRequest } from "../../../services/api/client";
import { apiEndpoints } from "../../../services/api/endpoints";
import "./AdminPage.css";

const ADMIN_EMAIL = "jonatas.freire.prof@gmail.com";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCellValue(val) {
  if (val === null || val === undefined) return <span className="admin-cell--null">NULL</span>;
  if (typeof val === "boolean") return <span className={`admin-cell--bool ${val ? "is-true" : "is-false"}`}>{String(val)}</span>;
  if (typeof val === "object") {
    const str = JSON.stringify(val);
    return (
      <span className="admin-cell--json" title={str}>
        {str.length > 60 ? str.slice(0, 60) + "…" : str}
      </span>
    );
  }
  const str = String(val);
  return str.length > 80 ? <span title={str}>{str.slice(0, 80)}…</span> : str;
}

// ── Components ────────────────────────────────────────────────────────────────

function TableList({ tables, selected, onSelect }) {
  return (
    <aside className="admin-sidebar">
      <h2 className="admin-sidebar__title">Tabelas</h2>
      <ul className="admin-sidebar__list">
        {tables.map((t) => (
          <li key={t.table_name}>
            <button
              type="button"
              className={`admin-sidebar__item ${selected === t.table_name ? "is-active" : ""}`}
              onClick={() => onSelect(t.table_name)}
            >
              <span className="admin-sidebar__name">{t.table_name}</span>
              <span className="admin-sidebar__count">
                {Number(t.row_estimate) > 0 ? `~${Number(t.row_estimate).toLocaleString("pt-BR")}` : "0"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function DataTable({ data, sort, order, onSort, onPage }) {
  if (!data) return <div className="admin-empty">Selecione uma tabela.</div>;

  const { columns, rows, pagination } = data;

  return (
    <section className="admin-data">
      <div className="admin-data__meta">
        <span>
          {pagination.total.toLocaleString("pt-BR")} registro{pagination.total !== 1 ? "s" : ""}
        </span>
        <span>
          Página {pagination.page} / {pagination.totalPages || 1}
        </span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.column_name}
                  className={`admin-table__th ${sort === col.column_name ? "is-sorted" : ""}`}
                  onClick={() => onSort(col.column_name)}
                >
                  {col.column_name}
                  {sort === col.column_name && (
                    <span className="admin-sort-icon">{order === "asc" ? " ↑" : " ↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="admin-table__empty">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="admin-table__row">
                  {columns.map((col) => (
                    <td key={col.column_name} className="admin-table__td">
                      {formatCellValue(row[col.column_name])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <button
          type="button"
          className="admin-pagination__btn"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          ← Anterior
        </button>
        <span>
          {pagination.page} / {pagination.totalPages || 1}
        </span>
        <button
          type="button"
          className="admin-pagination__btn"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPage(pagination.page + 1)}
        >
          Próxima →
        </button>
      </div>
    </section>
  );
}

function QueryPanel({ onResult }) {
  const [sql, setSql] = useState("SELECT * FROM accounts LIMIT 10;");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest(apiEndpoints.adminQuery, {
        method: "POST",
        body: JSON.stringify({ sql }),
      });
      onResult(result);
    } catch (e) {
      setError(e.message || "Erro ao executar query.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-query">
      <h3 className="admin-query__title">SQL Console <span className="admin-badge">SELECT only</span></h3>
      <textarea
        className="admin-query__input"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={4}
        spellCheck={false}
      />
      {error && <p className="admin-query__error">{error}</p>}
      <button
        type="button"
        className="admin-query__run"
        disabled={loading}
        onClick={run}
      >
        {loading ? "Executando…" : "▶ Executar"}
      </button>
    </div>
  );
}

function QueryResult({ result }) {
  if (!result) return null;

  return (
    <section className="admin-data">
      <div className="admin-data__meta">
        <span>{result.rowCount} linha{result.rowCount !== 1 ? "s" : ""} retornadas</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {result.fields.map((f) => (
                <th key={f} className="admin-table__th">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={result.fields.length} className="admin-table__empty">Sem resultados.</td>
              </tr>
            ) : (
              result.rows.map((row, i) => (
                <tr key={i} className="admin-table__row">
                  {result.fields.map((f) => (
                    <td key={f} className="admin-table__td">{formatCellValue(row[f])}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const user = getStoredApiUser();

  // Redireciona se não for admin
  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [sort, setSort] = useState("id");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("tables"); // 'tables' | 'query'
  const [queryResult, setQueryResult] = useState(null);

  // Carrega lista de tabelas
  useEffect(() => {
    setLoadingTables(true);
    apiRequest(apiEndpoints.adminTables)
      .then((data) => setTables(data.tables || []))
      .catch(() => {})
      .finally(() => setLoadingTables(false));
  }, []);

  // Carrega dados da tabela selecionada
  const loadTableData = useCallback(
    async (tableName, p = 1, s = sort, o = order) => {
      setLoadingData(true);
      try {
        const url = `${apiEndpoints.adminTableData(tableName)}?page=${p}&limit=50&sort=${s}&order=${o}`;
        const data = await apiRequest(url);
        setTableData(data);
      } catch {
        setTableData(null);
      } finally {
        setLoadingData(false);
      }
    },
    [sort, order]
  );

  function selectTable(name) {
    setSelectedTable(name);
    setPage(1);
    setSort("id");
    setOrder("desc");
    loadTableData(name, 1, "id", "desc");
  }

  function handleSort(col) {
    const newOrder = sort === col && order === "desc" ? "asc" : "desc";
    setSort(col);
    setOrder(newOrder);
    loadTableData(selectedTable, page, col, newOrder);
  }

  function handlePage(p) {
    setPage(p);
    loadTableData(selectedTable, p, sort, order);
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-header__title">🛢 Admin — Banco de Dados</h1>
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === "tables" ? "is-active" : ""}`}
            onClick={() => setActiveTab("tables")}
          >
            Tabelas
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "query" ? "is-active" : ""}`}
            onClick={() => setActiveTab("query")}
          >
            SQL Console
          </button>
        </div>
      </header>

      {activeTab === "tables" && (
        <div className="admin-layout">
          {loadingTables ? (
            <div className="admin-loading">Carregando tabelas…</div>
          ) : (
            <TableList tables={tables} selected={selectedTable} onSelect={selectTable} />
          )}

          <main className="admin-main">
            {loadingData ? (
              <div className="admin-loading">Carregando dados…</div>
            ) : (
              <DataTable
                data={tableData}
                sort={sort}
                order={order}
                onSort={handleSort}
                onPage={handlePage}
              />
            )}
          </main>
        </div>
      )}

      {activeTab === "query" && (
        <div className="admin-query-layout">
          <QueryPanel onResult={setQueryResult} />
          <QueryResult result={queryResult} />
        </div>
      )}
    </div>
  );
}
