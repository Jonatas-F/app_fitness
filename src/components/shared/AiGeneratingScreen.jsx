/**
 * AiGeneratingScreen — tela de progresso por etapas para geração de IA.
 *
 * Usada tanto no onboarding (FirstCheckinModal) quanto no check-in (CheckinsPage).
 * Cada item (treino / dieta) mostra 5 sub-etapas animadas enquanto a API processa,
 * com suporte a retry individual por item.
 */
import { useState, useRef, useEffect } from "react";
import "./AiGeneratingScreen.css";

// ── Etapas simuladas ─────────────────────────────────────────────────────────
// Os delays são calibrados para cobrir o tempo típico de resposta da API (30-90s).
// Quando a API responde antes, todos os passos pulam para ✓ imediatamente.

export const WORKOUT_STEPS = [
  { text: "Lendo seu perfil, histórico e dias disponíveis", delay: 0 },
  { text: "Definindo o split ideal para sua frequência",    delay: 5500 },
  { text: "Selecionando exercícios por grupo muscular",     delay: 13000 },
  { text: "Calculando volume, séries e intervalos",         delay: 24000 },
  { text: "Personalizando dicas e revisando protocolo",     delay: 42000 },
];

export const DIET_STEPS = [
  { text: "Calculando sua necessidade calórica (TDEE)",   delay: 1000 },
  { text: "Definindo macronutrientes por objetivo",        delay: 8500 },
  { text: "Montando refeições com suas preferências",      delay: 18000 },
  { text: "Criando variações para todos os 7 dias",        delay: 31000 },
  { text: "Ajustando substituições e finalizando",         delay: 49000 },
];

// ── Hook de simulação de etapas ───────────────────────────────────────────────

export function useSimulatedSteps(status, steps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const timersRef = useRef([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (status !== "generating") {
      if (status === "ok") setActiveIdx(steps.length - 1);
      return;
    }

    setActiveIdx(0);
    steps.slice(1).forEach((step, i) => {
      const t = setTimeout(
        () => setActiveIdx(prev => Math.max(prev, i + 1)),
        step.delay
      );
      timersRef.current.push(t);
    });

    return () => timersRef.current.forEach(clearTimeout);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return status === "ok" ? steps.length - 1 : activeIdx;
}

// ── Card expandido por item ───────────────────────────────────────────────────

export function GenItemExpanded({ emoji, label, steps, status, errorMsg, onRetry }) {
  const activeIdx = useSimulatedSteps(status, steps);

  const subText =
    status === "generating"
      ? (steps[activeIdx]?.text ?? steps[steps.length - 1].text)
      : status === "ok"
      ? "Concluído com sucesso"
      : "Falhou — tente novamente";

  return (
    <div className={`ob-gen-card ob-gen-card--${status}`}>
      <div className="ob-gen-card__header">
        <span className="ob-gen-card__emoji">{emoji}</span>
        <div className="ob-gen-card__info">
          <span className="ob-gen-card__title">{label}</span>
          <span className={`ob-gen-card__sub ob-gen-card__sub--${status}`}>{subText}</span>
        </div>
        <div className="ob-gen-card__badge">
          {status === "generating" && <span className="ob-gen-spinner" />}
          {status === "ok"         && <span className="ob-gen-check">✓</span>}
          {status === "error"      && <span className="ob-gen-fail">✗</span>}
        </div>
      </div>

      <ol className="ob-gen-steps">
        {steps.map((step, i) => {
          const s =
            status === "ok"
              ? "done"
              : i < activeIdx
              ? "done"
              : i === activeIdx && status === "generating"
              ? "active"
              : "wait";
          return (
            <li key={i} className={`ob-gen-step ob-gen-step--${s}`}>
              <span className="ob-gen-step__dot" aria-hidden="true">
                {s === "done" ? "✓" : s === "active" ? "" : "·"}
              </span>
              {s === "active" && <span className="ob-gen-step__spin" />}
              <span className="ob-gen-step__text">{step.text}</span>
            </li>
          );
        })}
      </ol>

      {status === "error" && (
        <div className="ob-gen-card__error">
          {errorMsg && <p className="ob-gen-card__errmsg">{errorMsg}</p>}
          {onRetry && (
            <button type="button" className="ob-gen-retry" onClick={onRetry}>
              ↺ Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AiGeneratingScreen({
  workoutStatus  = "generating",
  dietStatus     = "generating",
  workoutError   = null,
  dietError      = null,
  onRetryWorkout,
  onRetryDiet,
  onComplete,
  completeLabel  = "Entrar no Shape Certo →",
  workoutEnabled = true,
  dietEnabled    = true,
}) {
  const activeStatuses = [
    workoutEnabled ? workoutStatus : null,
    dietEnabled    ? dietStatus    : null,
  ].filter(Boolean);

  const allDone  = activeStatuses.every(s => s !== "generating");
  const hasError = activeStatuses.some(s => s === "error");

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true">
      <div className="ob-modal ob-modal--generating glass-panel">

        {/* Cabeçalho */}
        <div className="ob-gen-header">
          {!allDone ? (
            <>
              <div className="ob-gen-pulse" />
              <h2 className="ob-gen-title">Criando seus protocolos...</h2>
              <p className="ob-gen-subtitle">
                A IA está analisando seus dados. Acompanhe cada etapa abaixo.
              </p>
            </>
          ) : hasError ? (
            <>
              <span className="ob-gen-done-icon">⚠️</span>
              <h2 className="ob-gen-title">Atenção — um item falhou</h2>
              <p className="ob-gen-subtitle">
                Clique em ↺ Tentar para regenerar o item que falhou.
              </p>
            </>
          ) : (
            <>
              <span className="ob-gen-done-icon">🎉</span>
              <h2 className="ob-gen-title">Tudo pronto!</h2>
              <p className="ob-gen-subtitle">
                Seus protocolos foram atualizados com os dados deste check-in.
              </p>
            </>
          )}
        </div>

        {/* Barra indeterminada */}
        {!allDone && (
          <div className="ob-gen-bar-wrap">
            <div className="ob-gen-bar-track">
              <div className="ob-gen-bar-fill" />
            </div>
            <p className="ob-gen-note">Isso pode levar até 90 segundos. Não feche o app.</p>
          </div>
        )}

        {/* Cards com etapas */}
        <div className="ob-gen-list">
          {workoutEnabled && (
            <GenItemExpanded
              emoji="🏋️"
              label="Protocolo de treino"
              steps={WORKOUT_STEPS}
              status={workoutStatus}
              errorMsg={workoutError}
              onRetry={workoutStatus === "error" ? onRetryWorkout : null}
            />
          )}
          {dietEnabled && (
            <GenItemExpanded
              emoji="🥗"
              label="Plano alimentar"
              steps={DIET_STEPS}
              status={dietStatus}
              errorMsg={dietError}
              onRetry={dietStatus === "error" ? onRetryDiet : null}
            />
          )}
        </div>

        {/* Botão de conclusão */}
        {allDone && (
          <div
            className="ob-modal__footer"
            style={{ justifyContent: "center", flexDirection: "column", gap: "8px" }}
          >
            <button
              type="button"
              className="primary-button ob-gen-enter-btn"
              onClick={onComplete}
            >
              {hasError ? "Fechar mesmo assim →" : completeLabel}
            </button>
            {hasError && (
              <p className="ob-gen-note" style={{ textAlign: "center" }}>
                Você pode tentar novamente clicando em ↺ acima, ou gerar manualmente
                nas páginas de Treinos e Dieta.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
