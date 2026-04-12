import { useState } from "react";
import {
  getDietMetrics,
  loadDietHistory,
  loadDietProtocol,
  saveDietProtocol,
} from "../../../data/dietStorage";
import "./NutritionPage.css";

export default function NutritionPage() {
  const [diet, setDiet] = useState(() => loadDietProtocol());
  const [feedback, setFeedback] = useState("");
  const [openMeals, setOpenMeals] = useState([]);
  const metrics = getDietMetrics(diet, loadDietHistory());

  function updateDiet(nextDiet) {
    setDiet(saveDietProtocol(nextDiet));
  }

  function handleDietField(field, value) {
    updateDiet({ ...diet, [field]: value });
  }

  function handleMealField(mealId, field, value) {
    updateDiet({
      ...diet,
      meals: diet.meals.map((meal) =>
        meal.id === mealId ? { ...meal, [field]: value } : meal
      ),
    });
  }

  function requestDietFeedback() {
    setFeedback(
      "Solicitação enviada ao Personal Virtual. O plano deve respeitar disponibilidade, restrições e preferências informadas."
    );
  }

  function toggleMeal(meal) {
    if (!meal.enabled) {
      return;
    }

    setOpenMeals((current) =>
      current.includes(meal.id)
        ? current.filter((id) => id !== meal.id)
        : [...current, meal.id]
    );
  }

  return (
    <section className="nutrition-page">
      <header className="nutrition-hero glass-panel">
        <span>Dietas</span>
        <h1>Plano alimentar por refeições habilitadas.</h1>
        <p>
          O Personal Virtual define quais refeições entram no plano com base na
          agenda, objetivo, check-in e preferências do usuário.
        </p>
      </header>

      {feedback ? <p className="nutrition-feedback">{feedback}</p> : null}

      <section className="nutrition-metrics">
        {metrics.map((item) => (
          <article key={item.label} className="module-stat glass-panel">
            <span className="module-stat__label">{item.label}</span>
            <strong className="module-stat__value">{item.value}</strong>
            <span className="module-stat__helper">{item.trend}</span>
          </article>
        ))}
      </section>

      <section className="nutrition-config glass-panel">
        <div>
          <h2>Agenda alimentar e restrições</h2>
          <p>
            Se o usuário informar poucas refeições disponíveis, o Personal
            Virtual respeita a agenda e indica quando o ideal seria aumentar.
          </p>
        </div>

        <div className="nutrition-config__grid">
          <label>
            Refeições disponíveis por dia
            <select
              value={diet.userAvailableMeals}
              onChange={(event) => handleDietField("userAvailableMeals", event.target.value)}
            >
              <option value="">Selecione</option>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((value) => (
                <option key={value} value={value}>
                  {value} refeição{value === "1" ? "" : "ões"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Recomendação do Personal Virtual
            <input
              value={diet.recommendedMeals}
              onChange={(event) => handleDietField("recommendedMeals", event.target.value)}
              placeholder="Ex.: 5"
            />
          </label>

          <label>
            Restrições, alergias e intolerâncias
            <textarea
              value={diet.restrictionNotes}
              onChange={(event) => handleDietField("restrictionNotes", event.target.value)}
              placeholder="Ex.: lactose, glúten, oleaginosas, frutos do mar..."
            />
          </label>

          <label>
            Preferências e alimentos favoritos
            <textarea
              value={diet.preferenceNotes}
              onChange={(event) => handleDietField("preferenceNotes", event.target.value)}
              placeholder="Ex.: ovos, arroz, carne, frutas, café..."
            />
          </label>
        </div>

        <button type="button" className="primary-button" onClick={requestDietFeedback}>
          Solicitar ajuste do Personal Virtual
        </button>
      </section>

      <section className="meal-grid">
        {diet.meals.map((meal) => (
          <article
            key={meal.id}
            className={`meal-card glass-panel ${meal.enabled ? "is-enabled" : "is-disabled"} ${
              openMeals.includes(meal.id) ? "is-open" : ""
            }`}
          >
            <div className="meal-card__header">
              <button
                type="button"
                className="meal-card__toggle"
                onClick={() => toggleMeal(meal)}
                disabled={!meal.enabled}
                aria-expanded={openMeals.includes(meal.id)}
              >
                <span>{openMeals.includes(meal.id) ? "−" : "+"}</span>
                <div>
                  <h2>{meal.name}</h2>
                  <p>{meal.enabled ? "Habilitada no plano" : "Desabilitada neste protocolo"}</p>
                </div>
              </button>
              <span>{meal.enabled ? "Ativa" : "Inativa"}</span>
            </div>

            {openMeals.includes(meal.id) ? (
              <>
                <div className="meal-card__macros">
                  <label>
                    Calorias
                    <input
                      disabled={!meal.enabled}
                      value={meal.calories}
                      onChange={(event) => handleMealField(meal.id, "calories", event.target.value)}
                      placeholder="kcal"
                    />
                  </label>
                  <label>
                    Proteína
                    <input
                      disabled={!meal.enabled}
                      value={meal.protein}
                      onChange={(event) => handleMealField(meal.id, "protein", event.target.value)}
                      placeholder="g"
                    />
                  </label>
                  <label>
                    Carboidrato
                    <input
                      disabled={!meal.enabled}
                      value={meal.carbs}
                      onChange={(event) => handleMealField(meal.id, "carbs", event.target.value)}
                      placeholder="g"
                    />
                  </label>
                  <label>
                    Gorduras
                    <input
                      disabled={!meal.enabled}
                      value={meal.fats}
                      onChange={(event) => handleMealField(meal.id, "fats", event.target.value)}
                      placeholder="g"
                    />
                  </label>
                </div>

                <label className="meal-card__textarea">
                  Alimentos e quantidades
                  <textarea
                    disabled={!meal.enabled}
                    value={meal.foods}
                    onChange={(event) => handleMealField(meal.id, "foods", event.target.value)}
                    placeholder="O Personal Virtual preencherá os alimentos desta refeição."
                  />
                </label>

                <label className="meal-card__textarea">
                  Observações
                  <textarea
                    disabled={!meal.enabled}
                    value={meal.notes}
                    onChange={(event) => handleMealField(meal.id, "notes", event.target.value)}
                    placeholder="Substituições, horários, preparo..."
                  />
                </label>
              </>
            ) : null}
          </article>
        ))}
      </section>
    </section>
  );
}
