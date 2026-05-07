import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../data/appData";
import { NAV_ICONS } from "./NavIcons";
import logoMark from "../assets/logo_sp.svg";
import { getStoredApiUser, apiRequest } from "../services/api/client";
import { apiEndpoints } from "../services/api/endpoints";
import { ROUTE_PATHS } from "../routes/routePaths";

const ADMIN_EMAIL = "jonatas.freire.prof@gmail.com";
const OVERRIDE_KEY = "shapeCertoAdminPlanOverride";
const PLAN_LABELS = { basico: "Básico", intermediario: "Intermediário", pro: "Pro", partner: "Parceiro", admin: "ADM" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ── Token Chip (compacto, próximo ao logo) ───────────────────────────────────

function TokenChip({ subscription, loading }) {
  function openHistory() {
    window.dispatchEvent(new CustomEvent("shape-certo-open-token-history", { detail: { subscription } }));
  }
  if (loading) {
    return (
      <div className="sidebar__token-chip sidebar__token-chip--loading">
        <div className="sidebar__token-chip__bar">
          <div className="sidebar__token-chip__fill" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }
  if (!subscription) return null;

  const total   = subscription.token_limit   ?? 0;
  const balance = subscription.token_balance ?? 0;
  const used    = Math.max(0, total - balance);
  const pct     = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const pctRound = Math.round(pct);

  const refill = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "short",
      }).replace(".", "")
    : null;

  const planLabel = PLAN_LABELS[subscription.plan] ?? subscription.plan ?? "";
  const variant   = pct >= 95 ? "critical" : pct >= 80 ? "warning" : "";

  return (
    <button
      type="button"
      className={`sidebar__token-chip${variant ? ` sidebar__token-chip--${variant}` : ""}`}
      title="Clique para ver o histórico de uso"
      onClick={openHistory}
    >
      {/* Barra fina de progresso */}
      <div className="sidebar__token-chip__bar">
        <div className="sidebar__token-chip__fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Linha de números */}
      <div className="sidebar__token-chip__row">
        <span className="sidebar__token-chip__used">{fmtTokens(used)}</span>
        <span className="sidebar__token-chip__sep">/</span>
        <span className="sidebar__token-chip__total">{fmtTokens(total)}</span>
        <span className="sidebar__token-chip__sep">·</span>
        <span className="sidebar__token-chip__pct">{pctRound}%</span>
        {planLabel && (
          <>
            <span className="sidebar__token-chip__sep">·</span>
            <span className="sidebar__token-chip__plan">{planLabel}</span>
          </>
        )}
      </div>

      {/* Data de recarga */}
      {refill && (
        <div className="sidebar__token-chip__reset">
          <span className="sidebar__token-chip__reset-icon">↻</span>
          recarga {refill}
        </div>
      )}
    </button>
  );
}

// ── Admin Plan Switcher ──────────────────────────────────────────────────────

function AdminPlanSwitcher() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(
    () => localStorage.getItem(OVERRIDE_KEY) || null
  );

  const user = getStoredApiUser();
  if (user?.email !== ADMIN_EMAIL) return null;

  const plans = ["basico", "intermediario", "pro"];

  function select(plan) {
    localStorage.setItem(OVERRIDE_KEY, plan);
    setCurrent(plan);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("shape-certo-plan-override", { detail: plan }));
  }

  function clearOverride() {
    localStorage.removeItem(OVERRIDE_KEY);
    setCurrent(null);
    setOpen(false);
    window.dispatchEvent(new CustomEvent("shape-certo-plan-override", { detail: null }));
  }

  return (
    <div className="sidebar__admin-switcher">
      <button
        type="button"
        className="sidebar__admin-btn"
        title="Admin: simular plano para teste"
        onClick={() => setOpen((o) => !o)}
      >
        <span>🧪</span>
        <span>{current ? PLAN_LABELS[current] : "Plano real"}</span>
      </button>

      {open && (
        <div className="sidebar__admin-menu">
          {plans.map((p) => (
            <button
              key={p}
              type="button"
              className={`sidebar__admin-option${current === p ? " is-active" : ""}`}
              onClick={() => select(p)}
            >
              {PLAN_LABELS[p]}
            </button>
          ))}
          {current && (
            <button
              type="button"
              className="sidebar__admin-option sidebar__admin-option--reset"
              onClick={clearOverride}
            >
              ← Plano real
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        className="sidebar__admin-onboarding-btn"
        title="Resetar e testar o fluxo de primeiro acesso"
        onClick={() => {
          localStorage.removeItem("shapeCertoFirstCheckinDone");
          localStorage.removeItem("shapeCertoOnboardingDone");
          window.dispatchEvent(new CustomEvent("shape-certo-reset-onboarding"));
        }}
      >
        🔄 Testar 1º acesso
      </button>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading]     = useState(true);

  useEffect(() => {
    const user = getStoredApiUser();
    if (!user) { setSubLoading(false); return; }

    setSubLoading(true);
    apiRequest(apiEndpoints.billingSubscription)
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, []);

  // Recarrega subscription quando o usuário faz login ou quando a IA gera algo
  useEffect(() => {
    function refreshSub() {
      const user = getStoredApiUser();
      if (!user) { setSubscription(null); setSubLoading(false); return; }
      apiRequest(apiEndpoints.billingSubscription)
        .then((data) => setSubscription(data?.subscription ?? null))
        .catch(() => {});
    }

    function onAuth() {
      setSubLoading(true);
      refreshSub();
      setSubLoading(false);
    }

    window.addEventListener("shape-certo-auth-updated", onAuth);
    // Dispatchado por workout.service e diet.service após geração com IA
    window.addEventListener("shape-certo-tokens-updated", refreshSub);
    return () => {
      window.removeEventListener("shape-certo-auth-updated", onAuth);
      window.removeEventListener("shape-certo-tokens-updated", refreshSub);
    };
  }, []);

  return (
    <aside className="app-shell__sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">
          <img src={logoMark} alt="Shape Certo" />
        </span>
        <div>
          <p className="sidebar__brand-title">Shape Certo</p>
          <p className="sidebar__brand-subtitle">Personal Virtual</p>
        </div>
      </div>

      {/* Token chip — compacto, logo abaixo do brand */}
      <TokenChip
        subscription={subscription}
        loading={subLoading}
      />

      <nav className="sidebar__nav">
        {navigationItems.map((item) => {
          const Icon = NAV_ICONS[item.iconKey];
          // Mapeia path → data-tour para o guided tour conseguir destacar cada link
          const tourMap = {
            dashboard:      "nav-dashboard",
            checkins:       "nav-checkins",
            treinos:        "nav-treinos",
            dietas:         "nav-dieta",
            chat:           "nav-chat",
            configuracoes:  "nav-config",
          };
          const tourKey = Object.keys(tourMap).find((k) => item.path.includes(k));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              data-tour={tourKey ? tourMap[tourKey] : undefined}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
            >
              <span className="sidebar__link-icon">{Icon && <Icon />}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Botão Admin — visível somente para jonatas.freire.prof@gmail.com */}
        {getStoredApiUser()?.email === ADMIN_EMAIL && (
          <NavLink
            to={ROUTE_PATHS.admin}
            className={({ isActive }) =>
              `sidebar__link sidebar__link--admin ${isActive ? "sidebar__link--active" : ""}`
            }
          >
            <span className="sidebar__link-icon">🛢</span>
            <span>Admin DB</span>
          </NavLink>
        )}
      </nav>

      <AdminPlanSwitcher />
    </aside>
  );
}
