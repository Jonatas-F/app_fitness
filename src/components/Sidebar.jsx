import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../data/appData";
import { NAV_ICONS } from "./NavIcons";
import logoMark from "../assets/logo_sp.svg";
import { getStoredApiUser, apiRequest } from "../services/api/client";
import { apiEndpoints } from "../services/api/endpoints";

const ADMIN_EMAIL = "jonatas.freire.prof@gmail.com";
const OVERRIDE_KEY = "shapeCertoAdminPlanOverride";
const PLAN_LABELS = { basico: "Básico", intermediario: "Intermediário", pro: "Pro" };

// ── Token Counter ────────────────────────────────────────────────────────────

function TokenCounter({ subscription }) {
  if (!subscription) return null;

  const total = subscription.token_limit ?? 0;
  const balance = subscription.token_balance ?? 0;
  const used = Math.max(0, total - balance);
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const refill = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "—";

  const planLabel = PLAN_LABELS[subscription.plan] ?? subscription.plan ?? "—";

  return (
    <section className="sidebar__summary glass-panel">
      <h3 className="sidebar__summary-title">
        <span>Plano {planLabel}</span>
      </h3>

      <div className="sidebar__token-bar" title={`${pct}% dos tokens usados`}>
        <div
          className="sidebar__token-fill"
          style={{ width: `${pct}%` }}
          aria-label={`${pct}% dos tokens usados`}
        />
      </div>

      <ul className="sidebar__summary-list">
        <li>
          <span>Usados</span>
          <strong>{used.toLocaleString("pt-BR")}</strong>
        </li>
        <li>
          <span>Restantes</span>
          <strong>{balance.toLocaleString("pt-BR")}</strong>
        </li>
        <li>
          <span>Recarga em</span>
          <strong>{refill}</strong>
        </li>
      </ul>
    </section>
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
          <button
            type="button"
            className="sidebar__admin-option sidebar__admin-option--reset"
            onClick={() => {
              localStorage.removeItem("shapeCertoFirstCheckinDone");
              localStorage.removeItem("shapeCertoOnboardingDone");
              window.dispatchEvent(new CustomEvent("shape-certo-reset-onboarding"));
            }}
          >
            🔄 Testar 1º acesso
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    const user = getStoredApiUser();
    if (!user) return;

    apiRequest(apiEndpoints.billingSubscription)
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => {});
  }, []);

  // Recarrega subscription quando o usuário faz login
  useEffect(() => {
    function onAuth() {
      const user = getStoredApiUser();
      if (!user) { setSubscription(null); return; }
      apiRequest(apiEndpoints.billingSubscription)
        .then((data) => setSubscription(data?.subscription ?? null))
        .catch(() => {});
    }
    window.addEventListener("shape-certo-auth-updated", onAuth);
    return () => window.removeEventListener("shape-certo-auth-updated", onAuth);
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

      <nav className="sidebar__nav">
        {navigationItems.map((item) => {
          const Icon = NAV_ICONS[item.iconKey];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
            >
              <span className="sidebar__link-icon">{Icon && <Icon />}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <TokenCounter subscription={subscription} />
      <AdminPlanSwitcher />
    </aside>
  );
}
