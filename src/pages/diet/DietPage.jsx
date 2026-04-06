import { useMemo, useState } from "react";
import {
  createExampleDietProtocol,
  loadDietProtocol,
  loadDietHistory,
  saveDietProtocol,
  closeDietProtocol,
  resetDietState,
  getDietMetrics,
} from "../../data/dietStorage";
import "./diet.css";

function DietPage() {
  const [diet, setDiet] = useState(() => loadDietProtocol());
  const [history, setHistory] = useState(() => loadDietHistory());
  const [feedback, setFeedback] = useState("");

  const metrics = useMemo(() => getDietMetrics(diet, history), [diet, history]);

  function updateDietField(field, value) {
    setDiet((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateMealField(index, field, value) {
    setDiet((current) => ({
      ...current,
      meals: current.meals.map((meal, mealIndex) =>
        mealIndex === index
          ? {
              ...meal,
              [field]: value,
            }
          : meal
      ),
    }));
  }

  function handleSave() {
    const saved = saveDietProtocol(diet);
    setDiet(saved);
    setFeedback("Dieta atual salva com sucesso.");
  }

  function handleLoadExample() {
    const example = createExampleDietProtocol();
    setDiet(example);
    setFeedback("Exemplo de dieta carregado na tela.");
  }

  function handleCloseDiet() {
    const result = closeDietProtocol(diet);
    setDiet(result.currentDiet);
    setHistory(result.history);
    setFeedback("Dieta encerrada e movida para o histórico. Novo plano liberado.");
  }

  function handleReset() {
    const resetDiet = resetDietState();
    setDiet(resetDiet);
    setHistory([]);
    setFeedback("Dietas resetadas com sucesso.");
  }

  return (
    <section className="diet-page">
      <section className="hero-card">
        <span className="eyebrow">Protocolo alimentar</span>
        <h2 className="hero-title">
          Organize a dieta atual e mantenha o histórico dos planos anteriores.
        </h2>
        <p className="hero-description">
          Agora a área de dieta passa a salvar o plano atual, registrar o
          histórico de ciclos alimentares e preparar a base para futuras
          revisões com IA.
        </p>

        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={handleSave}>
            Salvar dieta
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={handleCloseDiet}
          >
            Encerrar dieta
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={handleLoadExample}
          >
            Carregar exemplo
          </button>

          <button type="button" className="ghost-button" onClick={handleReset}>
            Resetar dietas
          </button>
        </div>

        {feedback ? <p className="text-secondary mt-16">{feedback}</p> : null}
      </section>

      <section className="grid grid-4">
        {metrics.map((item) => (
          <article key={item.label} className="metric-card">
            <div className="metric-label">{item.label}</div>
            <div className="metric-value">{item.value}</div>
            <div className="metric-trend">{item.trend}</div>
          </article>
        ))}
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Dieta atual</h3>
            <p className="card-subtitle">
              Dados principais do ciclo alimentar em andamento.
            </p>
          </div>
          <span className="badge badge-primary">Atual</span>
        </div>

        <div className="form-grid grid-2">
          <div className="input-group">
            <label className="input-label">Nome da dieta</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: Dieta Hipertrofia 01"
              value={diet.title}
              onChange={(event) => updateDietField("title", event.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Objetivo nutricional</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: Superávit controlado para massa magra"
              value={diet.nutritionalGoal}
              onChange={(event) =>
                updateDietField("nutritionalGoal", event.target.value)
              }
            />
          </div>
        </div>

        <div className="form-grid grid-2 mt-16">
          <div className="input-group">
            <label className="input-label">Data de início</label>
            <input
              className="input-field"
              type="date"
              value={diet.startDate}
              onChange={(event) =>
                updateDietField("startDate", event.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Data final</label>
            <input
              className="input-field"
              type="date"
              value={diet.endDate}
              onChange={(event) =>
                updateDietField("endDate", event.target.value)
              }
            />
          </div>
        </div>

        <div className="form-grid grid-2 mt-16">
          <div className="input-group">
            <label className="input-label">Estratégia alimentar</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: Alta proteína com refeeds planejados"
              value={diet.strategy}
              onChange={(event) =>
                updateDietField("strategy", event.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Hidratação</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 3,5 litros por dia"
              value={diet.hydration}
              onChange={(event) =>
                updateDietField("hydration", event.target.value)
              }
            />
          </div>
        </div>

        <div className="input-group mt-16">
          <label className="input-label">Observações</label>
          <textarea
            className="textarea-field"
            placeholder="Observações gerais do plano, aderência, preferências e cuidados."
            value={diet.notes}
            onChange={(event) => updateDietField("notes", event.target.value)}
          />
        </div>
      </section>

      <section className="diet-meals-grid">
        {diet.meals.map((meal, index) => (
          <article key={meal.id} className="glass-card card-padding">
            <div className="card-header">
              <div>
                <h3 className="card-title">{meal.name}</h3>
                <p className="card-subtitle">
                  Estrutura da refeição dentro do plano atual.
                </p>
              </div>
              <span className="badge badge-success">{index + 1}</span>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Nome da refeição</label>
                <input
                  className="input-field"
                  type="text"
                  value={meal.name}
                  onChange={(event) =>
                    updateMealField(index, "name", event.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label className="input-label">Descrição</label>
                <textarea
                  className="textarea-field diet-meal-description"
                  placeholder="Ex.: Frango, arroz, legumes e fruta."
                  value={meal.description}
                  onChange={(event) =>
                    updateMealField(index, "description", event.target.value)
                  }
                />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Histórico de dietas</h3>
            <p className="card-subtitle">
              Planos anteriores encerrados e salvos para consulta.
            </p>
          </div>
          <span className="badge badge-primary">{history.length}</span>
        </div>

        {history.length === 0 ? (
          <div className="diet-empty-history">
            Ainda não existem dietas finalizadas. Quando você encerrar a dieta
            atual, ela aparecerá aqui.
          </div>
        ) : (
          <div className="diet-history-list">
            {history.map((item) => (
              <article key={item.id} className="diet-history-card">
                <div className="diet-history-top">
                  <div>
                    <h4>{item.title || "Dieta sem nome"}</h4>
                    <p>
                      {item.startDate || "--"} até {item.endDate || "--"}
                    </p>
                  </div>

                  <span className="badge badge-success">Encerrada</span>
                </div>

                <div className="diet-history-grid">
                  <div className="data-row">
                    <span>Objetivo nutricional</span>
                    <strong>{item.nutritionalGoal || "--"}</strong>
                  </div>

                  <div className="data-row">
                    <span>Estratégia</span>
                    <strong>{item.strategy || "--"}</strong>
                  </div>

                  <div className="data-row">
                    <span>Hidratação</span>
                    <strong>{item.hydration || "--"}</strong>
                  </div>

                  <div className="data-row">
                    <span>Fechada em</span>
                    <strong>
                      {item?.metadata?.closedAt
                        ? new Date(item.metadata.closedAt).toLocaleString("pt-BR")
                        : "--"}
                    </strong>
                  </div>
                </div>

                <div className="diet-history-meals">
                  {item.meals.map((meal) => (
                    <div key={`${item.id}-${meal.id}`} className="diet-history-meal">
                      <strong>{meal.name || "Refeição"}</strong>
                      <p>{meal.description || "Sem descrição registrada."}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default DietPage;