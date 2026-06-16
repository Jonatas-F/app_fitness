import { useState, useEffect, useMemo, useRef } from "react";
import { saveWorkoutSession, getPreviousWorkoutSession } from "../../data/workoutExecutionStorage";
import { getFocusColor } from "./planHelpers";
import "./plan-overview.css";

function fmt(total) {
  const s = Math.max(Number(total) || 0, 0);
  const m = Math.floor(s / 60);
  const x = s % 60;
  return `${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}

export default function WorkoutSessionModal({ plan, onClose }) {
  const activeWorkouts = useMemo(() => (plan?.workouts || []).filter((w) => w.enabled), [plan]);

  const [view, setView] = useState("select"); // select | session
  const [workout, setWorkout] = useState(null); // cópia editável do treino escolhido
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0); // segundos de sessão
  const [rest, setRest] = useState(0);        // segundos de descanso restantes
  const [done, setDone] = useState({});       // "exIdx-setIdx" → true
  const prevRef = useRef(null);               // sessão anterior (para placeholders)

  // Um único timer: sessão sobe, descanso desce.
  useEffect(() => {
    if (view !== "session") return undefined;
    const t = window.setInterval(() => {
      setElapsed((e) => e + 1);
      setRest((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [view]);

  function pickWorkout(w) {
    setWorkout(JSON.parse(JSON.stringify(w)));
    prevRef.current = getPreviousWorkoutSession(w.id);
    setStartedAt(new Date().toISOString());
    setElapsed(0);
    setRest(0);
    setDone({});
    setView("session");
  }

  function setField(exIdx, setIdx, field, value) {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) =>
        i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s, j) => (j !== setIdx ? s : { ...s, [field]: value })) }
      ),
    }));
  }

  function toggleDone(exIdx, setIdx, restSeconds) {
    const key = `${exIdx}-${setIdx}`;
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next[key]) setRest(Number(restSeconds) || 90); // marcou feito → inicia descanso
      return next;
    });
  }

  function finish() {
    if (workout) saveWorkoutSession(workout, { startedAt });
    onClose?.({ finished: true });
  }

  function prevSet(exId, setIdx) {
    const ex = prevRef.current?.exercises?.find((e) => e.id === exId);
    return ex?.sets?.[setIdx];
  }

  const doneCount = Object.values(done).filter(Boolean).length;
  const totalSets = workout
    ? workout.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.enabled !== false).length, 0)
    : 0;

  return (
    <div className="plan-session-overlay" role="dialog" aria-modal="true">
      <div className="plan-session-modal">
        {/* ── Passo 1: escolher o treino ── */}
        {view === "select" && (
          <>
            <div className="plan-session-head">
              <div>
                <div className="plan-hero__label">Iniciar treino</div>
                <h2 className="plan-session-title">Qual treino você vai fazer?</h2>
              </div>
              <button type="button" className="plan-exec-close" aria-label="Fechar" onClick={() => onClose?.()}>✕</button>
            </div>

            {activeWorkouts.length > 0 ? (
              <div className="plan-day-cards">
                {activeWorkouts.map((w, i) => {
                  const exCount = (w.exercises || []).filter((e) => e?.name).length;
                  return (
                    <button key={w.id} type="button" className="plan-day-card plan-session-pick" onClick={() => pickWorkout(w)}>
                      <span className="plan-day-card__badge">D{i + 1}</span>
                      <span className="plan-day-card__info">
                        <span className="plan-day-card__name">{w.title}</span>
                        <span className="plan-day-card__focus">{w.focus} · {exCount} exercícios</span>
                      </span>
                      <span className={`plan-day-card__tag ${getFocusColor(w.focus)}`}>{w.focus || "Treino"}</span>
                      <span className="plan-session-pick__go">▶</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="plan-empty">
                <strong>Nenhum treino ativo no plano</strong>
                Gere seu treino com o Personal Virtual para iniciar uma sessão.
              </div>
            )}
          </>
        )}

        {/* ── Passo 2: sessão em andamento ── */}
        {view === "session" && workout && (
          <>
            <div className="plan-session-head">
              <div>
                <div className="plan-hero__label">{workout.focus || "Treino"}</div>
                <h2 className="plan-session-title">{workout.title}</h2>
              </div>
              <button type="button" className="plan-exec-close" aria-label="Fechar" onClick={() => onClose?.()}>✕</button>
            </div>

            {/* Cronômetros */}
            <div className="plan-session-timers">
              <div className="plan-session-timer">
                <span className="plan-session-timer__label">Tempo de sessão</span>
                <span className="plan-session-timer__val">{fmt(elapsed)}</span>
              </div>
              <div className={`plan-session-timer plan-session-timer--rest${rest > 0 ? " is-active" : ""}`}>
                <span className="plan-session-timer__label">Descanso</span>
                <span className="plan-session-timer__val">{rest > 0 ? fmt(rest) : "--:--"}</span>
              </div>
            </div>

            {rest > 0 && (
              <div className="plan-session-rest-actions">
                <button type="button" className="plan-cta plan-cta--ghost" onClick={() => setRest((r) => r + 30)}>+30s</button>
                <button type="button" className="plan-cta plan-cta--ghost" onClick={() => setRest(0)}>Pular descanso</button>
              </div>
            )}

            <div className="plan-session-progress">{doneCount}/{totalSets} séries concluídas</div>

            {/* Exercícios e séries */}
            <div className="plan-session-exercises">
              {workout.exercises.filter((e) => e?.name).map((ex, exIdx) => (
                <div key={ex.id || exIdx} className="plan-session-ex">
                  <div className="plan-session-ex__head">
                    <span className="plan-session-ex__name">{ex.name}</span>
                    <span className="plan-session-ex__target">
                      {ex.suggestedSets || 3}×{ex.suggestedReps || "8-12"} · {ex.restSeconds || 90}s
                    </span>
                  </div>
                  <div className="plan-session-set plan-session-set--head">
                    <span>#</span><span>Carga (kg)</span><span>Reps</span><span>✓</span>
                  </div>
                  {ex.sets.filter((s) => s.enabled !== false).map((s, setIdx) => {
                    const key = `${exIdx}-${setIdx}`;
                    const p = prevSet(ex.id, setIdx);
                    return (
                      <div key={setIdx} className={`plan-session-set${done[key] ? " is-done" : ""}`}>
                        <span className="plan-session-set__num">{setIdx + 1}</span>
                        <input
                          className="plan-session-set__input"
                          inputMode="decimal"
                          placeholder={p?.weight ? `${p.weight}` : "kg"}
                          value={s.weight}
                          onChange={(e) => setField(exIdx, setIdx, "weight", e.target.value)}
                        />
                        <input
                          className="plan-session-set__input"
                          inputMode="numeric"
                          placeholder={p?.reps ? `${p.reps}` : "reps"}
                          value={s.reps}
                          onChange={(e) => setField(exIdx, setIdx, "reps", e.target.value)}
                        />
                        <button
                          type="button"
                          className="plan-session-set__check"
                          aria-label={done[key] ? "Desmarcar série" : "Marcar série como feita"}
                          onClick={() => toggleDone(exIdx, setIdx, ex.restSeconds)}
                        >
                          {done[key] ? "✓" : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="plan-session-footer">
              <button type="button" className="plan-cta plan-cta--ghost" onClick={() => setView("select")}>← Trocar treino</button>
              <button type="button" className="plan-cta" onClick={finish}>Finalizar treino →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
