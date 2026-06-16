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

function UserActionsPanel() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

  async function handleResetOnboarding(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setMessage(null);
    try {
      const result = await apiRequest(apiEndpoints.adminResetOnboarding, {
        method: "POST",
        body: JSON.stringify({ email: trimmed }),
      });
      setMessage({
        type: "success",
        text: `Onboarding resetado para ${result.email}. Na próxima vez que o usuário logar, o modal será exibido novamente.`,
      });
      setEmail("");
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Erro ao resetar onboarding." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-actions">
      <section className="admin-actions__section">
        <h3 className="admin-actions__title">🔄 Resetar Onboarding</h3>
        <p className="admin-actions__desc">
          O usuário verá o modal de primeiro acesso novamente no próximo login.
        </p>
        <form className="admin-actions__form" onSubmit={handleResetOnboarding}>
          <input
            className="admin-actions__input"
            type="email"
            placeholder="E-mail do usuário"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="admin-actions__btn"
            disabled={loading || !email.trim()}
          >
            {loading ? "Resetando…" : "Resetar"}
          </button>
        </form>
        {message && (
          <p className={`admin-actions__msg admin-actions__msg--${message.type}`}>
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}

// ── User Manager ─────────────────────────────────────────────────────────────

const PLAN_LABELS = {
  basico: "Básico", intermediario: "Intermediário", pro: "Pro",
  partner: "Parceiro", admin: "ADM",
};
const PLAN_COLORS = {
  basico: "#6b7280", intermediario: "#3b82f6", pro: "#e50914",
  partner: "#10b981", admin: "#f59e0b",
};
const ALL_PLANS = ["basico", "intermediario", "pro", "partner"];

function fmtTokens(n) {
  if (!n && n !== 0) return "–";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function UserCard({ user, onRefresh }) {
  const [planLoading, setPlanLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [resetOpts, setResetOpts] = useState({
    checkins: false, workouts: false, diet: false,
    chat: false, settings: false, onboarding: false,
  });

  const currentPlan = user.plan_type || user.sub_plan || "basico";
  const used  = (user.token_limit ?? 0) - (user.token_balance ?? 0);
  const pct   = user.token_limit > 0 ? Math.round((Math.max(0, used) / user.token_limit) * 100) : 0;

  async function handleSetPlan(newPlan) {
    if (newPlan === currentPlan) return;
    if (!window.confirm(`Alterar plano de "${user.email}" de "${PLAN_LABELS[currentPlan] ?? currentPlan}" para "${PLAN_LABELS[newPlan]}"?`)) return;
    setPlanLoading(true);
    setMsg(null);
    try {
      await apiRequest(apiEndpoints.adminSetUserPlan, {
        method: "POST",
        body: JSON.stringify({ email: user.email, plan: newPlan }),
      });
      setMsg({ type: "success", text: `Plano alterado para ${PLAN_LABELS[newPlan]}.` });
      onRefresh();
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Erro ao alterar plano." });
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const selected = Object.entries(resetOpts).filter(([, v]) => v).map(([k]) => k);
    if (selected.length === 0) { setMsg({ type: "error", text: "Selecione ao menos uma opção." }); return; }
    if (!window.confirm(`⚠️ ATENÇÃO: Isso apagará permanentemente dados de "${user.email}".\n\nItens: ${selected.join(", ")}\n\nConfirmar?`)) return;
    setResetLoading(true);
    setMsg(null);
    try {
      const result = await apiRequest(apiEndpoints.adminResetUserData, {
        method: "POST",
        body: JSON.stringify({ email: user.email, options: resetOpts }),
      });
      setMsg({ type: "success", text: `Resetado: ${result.cleared?.join(", ") || "nada"}` });
      setShowReset(false);
      setResetOpts({ checkins: false, workouts: false, diet: false, chat: false, settings: false, onboarding: false });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Erro ao resetar." });
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="admin-user-card">
      <div className="admin-user-card__head">
        <div>
          <p className="admin-user-card__email">{user.email}</p>
        </div>
        <span
          className="admin-user-card__plan-badge"
          style={{ background: PLAN_COLORS[currentPlan] ?? "#6b7280" }}
        >
          {PLAN_LABELS[currentPlan] ?? currentPlan}
        </span>
      </div>

      {/* Token bar */}
      {user.token_limit > 0 && (
        <div className="admin-user-card__tokens">
          <div className="admin-user-card__token-bar">
            <div className="admin-user-card__token-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="admin-user-card__token-txt">
            {fmtTokens(Math.max(0, used))} / {fmtTokens(user.token_limit)} tokens ({pct}%)
          </span>
        </div>
      )}

      {/* Trocar plano */}
      <div className="admin-user-card__section">
        <p className="admin-user-card__section-title">Alterar plano</p>
        <div className="admin-user-card__plan-btns">
          {ALL_PLANS.map(p => (
            <button
              key={p}
              type="button"
              className={`admin-user-card__plan-btn${currentPlan === p ? " is-current" : ""}`}
              style={currentPlan === p ? { borderColor: PLAN_COLORS[p], color: PLAN_COLORS[p] } : {}}
              onClick={() => handleSetPlan(p)}
              disabled={planLoading}
            >
              {PLAN_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Reset seletivo */}
      <div className="admin-user-card__section">
        <button
          type="button"
          className="admin-user-card__reset-toggle"
          onClick={() => setShowReset(v => !v)}
        >
          {showReset ? "▲ Fechar reset" : "🗑 Resetar dados"}
        </button>
        {showReset && (
          <form className="admin-user-card__reset-form" onSubmit={handleReset}>
            <p className="admin-user-card__reset-warn">⚠️ Ação irreversível. Selecione o que apagar:</p>
            {[
              ["checkins",   "Check-ins"],
              ["workouts",   "Treinos (planos + sessões)"],
              ["diet",       "Dieta (planos + registros)"],
              ["chat",       "Chat + Histórico de IA"],
              ["settings",   "Configurações (avatar, nome do personal)"],
              ["onboarding", "Forçar re-onboarding no próximo login"],
            ].map(([key, label]) => (
              <label key={key} className="admin-user-card__reset-opt">
                <input
                  type="checkbox"
                  checked={resetOpts[key]}
                  onChange={e => setResetOpts(prev => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
            <button
              type="submit"
              className="admin-user-card__reset-btn"
              disabled={resetLoading || !Object.values(resetOpts).some(Boolean)}
            >
              {resetLoading ? "Resetando…" : "Confirmar reset"}
            </button>
          </form>
        )}
      </div>

      {msg && (
        <p className={`admin-user-card__msg admin-user-card__msg--${msg.type}`}>{msg.text}</p>
      )}
    </div>
  );
}

function UserManager() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search(e) {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiRequest(`${apiEndpoints.adminUsers}?q=${encodeURIComponent(query.trim())}`);
      setUsers(data.users || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-users">
      <form className="admin-users__search" onSubmit={search}>
        <input
          className="admin-users__input"
          type="text"
          placeholder="Buscar por e-mail…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="admin-users__search-btn" disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {!searched && (
        <p className="admin-users__hint">Digite um e-mail (parcial) e clique em Buscar.</p>
      )}

      {searched && !loading && users?.length === 0 && (
        <p className="admin-users__empty">Nenhum usuário encontrado.</p>
      )}

      {users?.length > 0 && (
        <div className="admin-users__list">
          {users.map(u => (
            <UserCard key={u.id} user={u} onRefresh={() => search()} />
          ))}
        </div>
      )}
    </div>
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
  const [tablesError, setTablesError] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState("tables"); // 'tables' | 'query' | 'users' | 'actions'
  const [queryResult, setQueryResult] = useState(null);

  // Carrega lista de tabelas
  const loadTables = useCallback(() => {
    setLoadingTables(true);
    setTablesError(null);
    apiRequest(apiEndpoints.adminTables)
      .then((data) => setTables(data.tables || []))
      .catch((err) => setTablesError(err?.message || "Erro ao carregar tabelas."))
      .finally(() => setLoadingTables(false));
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

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
          <button
            type="button"
            className={`admin-tab ${activeTab === "users" ? "is-active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👤 Usuários
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "actions" ? "is-active" : ""}`}
            onClick={() => setActiveTab("actions")}
          >
            Ações
          </button>
        </div>
      </header>

      {activeTab === "tables" && (
        <div className="admin-layout">
          {loadingTables ? (
            <div className="admin-loading">Carregando tabelas…</div>
          ) : tablesError ? (
            <aside className="admin-sidebar">
              <p style={{ color: "#f87272", fontSize: "0.82rem", padding: "12px" }}>{tablesError}</p>
              <button
                type="button"
                onClick={loadTables}
                style={{ margin: "0 12px", padding: "6px 14px", background: "rgba(139,92,246,0.7)", border: "none", borderRadius: "7px", color: "#fff", cursor: "pointer", fontSize: "0.82rem" }}
              >
                Tentar novamente
              </button>
            </aside>
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

      {activeTab === "users" && <UserManager />}

      {activeTab === "actions" && <UserActionsPanel />}
    </div>
  );
}
