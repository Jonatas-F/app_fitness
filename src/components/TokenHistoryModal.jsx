import { useEffect, useState } from "react";
import { apiRequest } from "../services/api/client";
import { apiEndpoints } from "../services/api/endpoints";

function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const GEN_TYPE_LABELS = {
  workout:        "Treino",
  diet:           "Dieta",
  chat:           "Chat",
  recommendation: "Recomendação",
};

export default function TokenHistoryModal({ subscription, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(apiEndpoints.billingTokenHistory)
      .then((data) => setHistory(data?.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  // Fecha ao pressionar Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const periodStart = subscription?.current_period_start
    ? new Date(subscription.current_period_start)
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        .replace(".", "")
    : null;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        .replace(".", "")
    : null;

  const totalUsed = (history || []).reduce((s, r) => s + (r.tokensTotal || 0), 0);

  return (
    <div
      className="token-history-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="token-history-panel" role="dialog" aria-modal="true" aria-label="Histórico de tokens">
        <div className="token-history-panel__header">
          <div>
            <strong>Uso de Tokens</strong>
            {periodStart && periodEnd && (
              <span className="token-history-panel__period">{periodStart} – {periodEnd}</span>
            )}
          </div>
          <button
            type="button"
            className="token-history-panel__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="token-history-panel__loading">Carregando…</div>
        ) : !history?.length ? (
          <div className="token-history-panel__empty">Nenhuma geração neste período.</div>
        ) : (
          <>
            <ul className="token-history-panel__list">
              {history.map((item) => (
                <li key={item.id} className="token-history-panel__item">
                  <div className="token-history-panel__item-top">
                    <span className={`token-history-panel__badge token-history-panel__badge--${item.type}`}>
                      {GEN_TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    <span className="token-history-panel__tokens">{fmtTokens(item.tokensTotal)}</span>
                  </div>
                  <div className="token-history-panel__item-bottom">
                    <span className="token-history-panel__date">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short",
                      }).replace(".", "")}
                      {" "}
                      {new Date(item.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    <span className="token-history-panel__detail">
                      ↑{fmtTokens(item.tokensInput)} ↓{fmtTokens(item.tokensOutput)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="token-history-panel__footer">
              <span>Total no período</span>
              <strong>{fmtTokens(totalUsed)} tokens</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
