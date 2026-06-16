import { useMemo, useState } from "react";
import { loadDietMealLogs, saveDietMealLog } from "../../data/dietStorage";
import { getMealColor } from "./planHelpers";
import "./plan-overview.css";

const DAY_IDS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const DAY_SHORT = { domingo: "DOM", segunda: "SEG", terca: "TER", quarta: "QUA", quinta: "QUI", sexta: "SEX", sabado: "SAB" };

function dateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function isDone(log) {
  return log?.status === "completed" || log?.status === "auto_completed";
}

export default function MealTrackingView({ diet }) {
  const [logs, setLogs] = useState(() => loadDietMealLogs());

  const todayDayId = DAY_IDS[new Date().getDay()];
  const todayKey = dateKey();

  const todayMeals = useMemo(() => {
    const dayPlan = diet?.dayPlans?.find((d) => d.id === todayDayId);
    const meals = (dayPlan?.meals && dayPlan.meals.length ? dayPlan.meals : diet?.meals) || [];
    return meals.filter((m) => m.enabled);
  }, [diet, todayDayId]);

  const logMap = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => map.set(`${l.dayId}-${l.slotId}-${l.logDate}`, l));
    return map;
  }, [logs]);

  const doneToday = todayMeals.filter((m) => isDone(logMap.get(`${todayDayId}-${m.id}-${todayKey}`))).length;

  function toggle(meal) {
    const key = `${todayDayId}-${meal.id}-${todayKey}`;
    const done = isDone(logMap.get(key));
    // saveDietMealLog grava no localStorage de forma síncrona antes do await da API,
    // então recarregamos os logs imediatamente (otimista) e deixamos a API resolver em segundo plano.
    const promise = saveDietMealLog({
      dietPlanId: diet?.id,
      dayId: todayDayId,
      slotId: meal.id,
      mealName: meal.name,
      logDate: todayKey,
      status: done ? "pending" : "completed",
      performedAt: done ? "" : new Date().toISOString(),
      source: "manual",
    });
    setLogs(loadDietMealLogs());
    Promise.resolve(promise).then(() => setLogs(loadDietMealLogs())).catch(() => {});
  }

  // Histórico — últimos 14 dias (% de refeições marcadas)
  const history = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const key = dateKey(date);
      const dayId = DAY_IDS[date.getDay()];
      const dayPlan = diet?.dayPlans?.find((d) => d.id === dayId);
      const meals = ((dayPlan?.meals && dayPlan.meals.length ? dayPlan.meals : diet?.meals) || []).filter((m) => m.enabled);
      const done = meals.filter((m) => isDone(logMap.get(`${dayId}-${m.id}-${key}`))).length;
      const total = meals.length || 1;
      return { key, label: String(date.getDate()).padStart(2, "0"), short: DAY_SHORT[dayId], pct: Math.round((done / total) * 100), done, total };
    });
  }, [diet, logMap]);

  return (
    <section className="plan-overview">
      <header className="plan-hero">
        <div className="plan-hero__label">Shape Certo · Acompanhamento</div>
        <h1 className="plan-hero__title">Refeições de hoje</h1>
        <div className="plan-hero__stats">
          <div className="plan-stat">
            <span className="plan-stat__val is-accent">{doneToday}<small>/{todayMeals.length}</small></span>
            <span className="plan-stat__label">Marcadas hoje</span>
          </div>
        </div>
      </header>

      <div className="plan-section">
        <div className="plan-section__header">
          <span className="plan-section__num">01</span>
          <span className="plan-section__title">Marque o que já comeu</span>
        </div>
        {todayMeals.length > 0 ? (
          <div className="plan-track-list">
            {todayMeals.map((meal) => {
              const done = isDone(logMap.get(`${todayDayId}-${meal.id}-${todayKey}`));
              const color = getMealColor(meal.id);
              return (
                <button
                  key={meal.id}
                  type="button"
                  className={`plan-track-row ${color}${done ? " is-done" : ""}`}
                  onClick={() => toggle(meal)}
                >
                  <span className="plan-track-check" aria-hidden="true">{done ? "✓" : ""}</span>
                  <span className="plan-track-info">
                    <span className="plan-track-name">{meal.name}</span>
                    {meal.calories && <span className="plan-track-meta">{meal.calories} kcal</span>}
                  </span>
                  <span className="plan-track-state">{done ? "Feito" : "Marcar"}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="plan-empty">
            <strong>Nenhuma refeição no plano de hoje</strong>
            Gere sua dieta para acompanhar as refeições.
          </div>
        )}
      </div>

      <div className="plan-section">
        <div className="plan-section__header">
          <span className="plan-section__num">02</span>
          <span className="plan-section__title">Últimos 14 dias</span>
        </div>
        <div className="plan-track-history">
          {history.map((d) => (
            <div key={d.key} className="plan-track-day" title={`${d.done}/${d.total} refeições`}>
              <span className="plan-track-day__bar">
                <span className="plan-track-day__fill" style={{ height: `${Math.max(d.pct, 4)}%` }} />
              </span>
              <span className="plan-track-day__num">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
