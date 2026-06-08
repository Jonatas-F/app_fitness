import { useMemo } from "react";
import { PlanExportButton } from "@/components/PlanExportButton";
import { getMealColor } from "./planHelpers";
import "./plan-overview.css";

const GOAL_DIET_TITLE = {
  hipertrofia: "BULK INTELIGENTE",
  powerlifting: "FORÇA & VOLUME",
  emagrecimento: "CUTTING",
  recomposicao: "RECOMPOSIÇÃO",
  cutting: "DEFINIÇÃO",
  condicionamento: "PERFORMANCE",
  saude: "ALIMENTAÇÃO SAUDÁVEL",
};

function num(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function MacroBars({ meals }) {
  const total = meals.reduce(
    (acc, m) => {
      acc.kcal += num(m.calories);
      acc.protein += num(m.protein);
      acc.carbs += num(m.carbs);
      acc.fat += num(m.fats);
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (total.kcal === 0) return null;

  const max = Math.max(total.protein * 4, total.carbs * 4, total.fat * 9, 1);
  const pct = (grams, factor) => Math.round(((grams * factor) / max) * 100);

  return (
    <div className="plan-macro-wrap">
      <div className="plan-macro-row">
        <span className="plan-macro-label" style={{ color: "var(--po-blue)" }}>Proteína</span>
        <div className="plan-macro-bar"><div className="plan-macro-fill" style={{ width: `${pct(total.protein, 4)}%`, background: "var(--po-blue)" }} /></div>
        <span className="plan-macro-val">{Math.round(total.protein)}g</span>
      </div>
      <div className="plan-macro-row">
        <span className="plan-macro-label" style={{ color: "var(--po-accent)" }}>Carboidrato</span>
        <div className="plan-macro-bar"><div className="plan-macro-fill" style={{ width: `${pct(total.carbs, 4)}%`, background: "var(--po-accent)" }} /></div>
        <span className="plan-macro-val">{Math.round(total.carbs)}g</span>
      </div>
      <div className="plan-macro-row">
        <span className="plan-macro-label" style={{ color: "var(--po-accent2)" }}>Gordura</span>
        <div className="plan-macro-bar"><div className="plan-macro-fill" style={{ width: `${pct(total.fat, 9)}%`, background: "var(--po-accent2)" }} /></div>
        <span className="plan-macro-val">{Math.round(total.fat)}g</span>
      </div>
      <div className="plan-macro-row">
        <span className="plan-macro-label" style={{ color: "var(--po-green)" }}>Total</span>
        <div className="plan-macro-bar"><div className="plan-macro-fill" style={{ width: "100%", background: "linear-gradient(90deg,var(--po-green),var(--po-accent))" }} /></div>
        <span className="plan-macro-val" style={{ color: "var(--po-green)" }}>{Math.round(total.kcal)}</span>
      </div>
    </div>
  );
}

function MealCard({ meal }) {
  const color = getMealColor(meal.id);
  const foods = (meal.foods || "").split(/[\n;]/).map((f) => f.trim()).filter(Boolean);
  const macros = [
    meal.calories && `${meal.calories} kcal`,
    meal.protein && `P ${meal.protein}g`,
    meal.carbs && `C ${meal.carbs}g`,
    meal.fats && `G ${meal.fats}g`,
  ].filter(Boolean).join(" · ");

  return (
    <div className={`plan-meal-card ${color}`}>
      <div className="plan-meal-time">{(meal.name || "").toUpperCase()}</div>
      {meal.description && <div className="plan-meal-name">{meal.description}</div>}
      {foods.length > 0 && (
        <ul className="plan-meal-items">
          {foods.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      {macros && (
        <div className="plan-meal-kcal"><span>Est.</span><strong>{macros}</strong></div>
      )}
    </div>
  );
}

export default function DietPlanOverview({ diet, checkin, onTrack, onRegenerate, onAdjust }) {
  const meals = useMemo(() => (diet?.meals || []).filter((m) => m.enabled), [diet]);
  const goal = checkin?.goal || diet?.goal || "hipertrofia";
  const title = GOAL_DIET_TITLE[goal] || "PLANO ALIMENTAR";
  const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const total = meals.reduce((acc, m) => acc + num(m.calories), 0);
  const mealsCount = meals.length;

  return (
    <section className="plan-overview">
      <header className="plan-hero">
        <div className="plan-hero__label">Shape Certo · Plano Alimentar · {dateStr}</div>
        <h1 className="plan-hero__title">{title}</h1>
        <div className="plan-hero__stats">
          {total > 0 && (
            <div className="plan-stat">
              <span className="plan-stat__val is-accent">{Math.round(total)}<small> kcal</small></span>
              <span className="plan-stat__label">Meta diária</span>
            </div>
          )}
          {mealsCount > 0 && (
            <div className="plan-stat">
              <span className="plan-stat__val">{mealsCount}<small>x</small></span>
              <span className="plan-stat__label">Refeições / dia</span>
            </div>
          )}
          {checkin?.weight && (
            <div className="plan-stat">
              <span className="plan-stat__val">{checkin.weight}<small> kg</small></span>
              <span className="plan-stat__label">Peso atual</span>
            </div>
          )}
        </div>
        <div className="plan-hero__actions">
          {onRegenerate && (
            <button type="button" className="plan-cta" onClick={onRegenerate}>
              ↻ Refazer plano
            </button>
          )}
          {onAdjust && (
            <button type="button" className="plan-cta plan-cta--ghost" onClick={onAdjust}>
              ✎ Ajustar / substituir
            </button>
          )}
          {onTrack && (
            <button type="button" className="plan-cta plan-cta--ghost" onClick={onTrack}>
              ✓ Marcar refeições
            </button>
          )}
          <PlanExportButton variant="ghost" label="Baixar plano" />
        </div>
      </header>

      {diet?.guidance && (
        <div className="plan-warn-box">{diet.guidance}</div>
      )}

      {meals.length > 0 ? (
        <>
          <div className="plan-section">
            <div className="plan-section__header">
              <span className="plan-section__num">01</span>
              <span className="plan-section__title">Distribuição diária</span>
            </div>
            <MacroBars meals={meals} />
          </div>

          <div className="plan-section">
            <div className="plan-section__header">
              <span className="plan-section__num">02</span>
              <span className="plan-section__title">Refeições</span>
            </div>
            <div className="plan-meal-grid">
              {meals.map((meal) => <MealCard key={meal.id} meal={meal} />)}
            </div>
          </div>
        </>
      ) : (
        <div className="plan-empty">
          <strong>Plano alimentar ainda não gerado</strong>
          Gere sua dieta com o Personal Virtual para ver as refeições aqui.
        </div>
      )}
    </section>
  );
}
