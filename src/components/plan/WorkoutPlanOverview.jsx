import { useMemo, useState } from "react";
import { PlanExportButton } from "@/components/PlanExportButton";
import { WEEK_ORDER, DAY_LABELS, getFocusColor, goalTitleHtml } from "./planHelpers";
import "./plan-overview.css";

// Renderiza a tabela de exercícios de um dia (objetos da API).
function ExerciseTable({ exercises }) {
  const rows = (exercises || []).filter((e) => e?.name);
  if (!rows.length) {
    return <p className="plan-empty" style={{ padding: "12px 0" }}>Exercícios não definidos.</p>;
  }
  return (
    <table className="plan-ex-table">
      <thead>
        <tr><th>Exercício</th><th>Séries × Reps</th><th>Descanso</th></tr>
      </thead>
      <tbody>
        {rows.map((ex, i) => {
          const enabledSets = Array.isArray(ex.sets)
            ? ex.sets.filter((s) => s.enabled !== false).length
            : Number(ex.suggestedSets || 3);
          const sets = enabledSets || Number(ex.suggestedSets || 3);
          const setsLabel = `${sets}×${ex.suggestedReps || "8-12"}`;
          const rest = ex.restSeconds ? `${ex.restSeconds}s` : "—";
          return (
            <tr key={ex.id || i}>
              <td>
                <div className="plan-ex-name">{ex.name}</div>
                {ex.notes ? <div className="plan-ex-note">{ex.notes}</div> : null}
              </td>
              <td><span className="plan-ex-sets">{setsLabel}</span></td>
              <td><span className="plan-ex-rest">{rest}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function WorkoutPlanOverview({ plan, checkin, onStartWorkout }) {
  const workouts = useMemo(() => plan?.workouts || [], [plan]);
  const activeWorkouts = useMemo(() => workouts.filter((w) => w.enabled), [workouts]);
  const [openId, setOpenId] = useState(() => activeWorkouts[0]?.id || null);

  const goal = checkin?.goal || "hipertrofia";
  const weight = checkin?.weight || "";
  const height = checkin?.height || "";
  const bf = checkin?.bodyFat || "";
  const trainingDays = activeWorkouts.length;
  const title = goalTitleHtml(goal);
  const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const byId = useMemo(() => Object.fromEntries(workouts.map((w) => [w.id, w])), [workouts]);

  return (
    <section className="plan-overview">
      {/* Hero */}
      <header className="plan-hero">
        <div className="plan-hero__label">Shape Certo · Plano de Treino · {dateStr}</div>
        <h1 className="plan-hero__title">{title}</h1>
        <div className="plan-hero__stats">
          {weight && (
            <div className="plan-stat">
              <span className="plan-stat__val">{weight}<small> kg</small></span>
              <span className="plan-stat__label">Peso atual</span>
            </div>
          )}
          {height && (
            <div className="plan-stat">
              <span className="plan-stat__val">{height}<small> cm</small></span>
              <span className="plan-stat__label">Altura</span>
            </div>
          )}
          {bf && (
            <div className="plan-stat">
              <span className="plan-stat__val is-orange">~{bf}<small> %</small></span>
              <span className="plan-stat__label">Gordura est.</span>
            </div>
          )}
          {trainingDays > 0 && (
            <div className="plan-stat">
              <span className="plan-stat__val is-accent">{trainingDays}<small>x</small></span>
              <span className="plan-stat__label">Dias / semana</span>
            </div>
          )}
        </div>
        <div className="plan-hero__actions">
          {onStartWorkout && (
            <button type="button" className="plan-cta" onClick={onStartWorkout}>
              ▶ Iniciar treino
            </button>
          )}
          <PlanExportButton variant="ghost" label="Baixar plano" />
        </div>
      </header>

      {/* Divisão semanal */}
      <div className="plan-section">
        <div className="plan-section__header">
          <span className="plan-section__num">01</span>
          <span className="plan-section__title">Divisão semanal</span>
        </div>

        {plan?.title && (
          <div className="plan-info-box">
            <strong>{plan.title}</strong>{plan.split ? ` — ${plan.split}` : ""}
          </div>
        )}

        <div className="plan-week-grid">
          {WEEK_ORDER.map((dayId) => {
            const day = byId[dayId];
            const short = DAY_LABELS[dayId] || dayId.slice(0, 3).toUpperCase();
            if (!day || !day.enabled) {
              return (
                <div key={dayId} className="plan-wday is-rest">
                  <div className="plan-wday__name">{short}</div>
                  <div className="plan-wday__label">Descanso</div>
                </div>
              );
            }
            const color = getFocusColor(day.focus);
            const label = (day.focus || day.title || "Treino").slice(0, 16);
            return (
              <div key={dayId} className={`plan-wday ${color}`}>
                <div className="plan-wday__name">{short}</div>
                <div className="plan-wday__label">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Cards de dia colapsáveis */}
        {activeWorkouts.length > 0 ? (
          <div className="plan-day-cards">
            {activeWorkouts.map((day, i) => {
              const color = getFocusColor(day.focus);
              const isOpen = openId === day.id;
              return (
                <div key={day.id} className={`plan-day-card${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="plan-day-card__header"
                    onClick={() => setOpenId(isOpen ? null : day.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="plan-day-card__badge">D{i + 1}</span>
                    <span className="plan-day-card__info">
                      <span className="plan-day-card__name">{day.title || `Treino ${i + 1}`}</span>
                      {day.focus && <span className="plan-day-card__focus">{day.focus}</span>}
                    </span>
                    <span className={`plan-day-card__tag ${color}`}>{day.focus || "Treino"}</span>
                    <span className="plan-day-card__chevron">▼</span>
                  </button>
                  {isOpen && (
                    <div className="plan-day-card__body">
                      <ExerciseTable exercises={day.exercises} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="plan-empty">
            <strong>Protocolo de treino ainda não gerado</strong>
            Gere seu treino com o Personal Virtual para ver o plano aqui.
          </div>
        )}

        {plan?.notes && (
          <div className="plan-info-box"><strong>Observações:</strong> {plan.notes}</div>
        )}
      </div>
    </section>
  );
}
