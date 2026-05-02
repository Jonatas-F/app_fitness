import { useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  closeDietProtocol,
  createExampleDietProtocol,
  dietDays,
  getDietMetrics,
  hydrateDietHistoryFromApi,
  hydrateDietMealLogsFromApi,
  hydrateDietProtocolFromApi,
  loadDietHistory,
  loadDietMealLogs,
  loadDietProtocol,
  resetDietState,
  saveDietProtocol,
} from "../../data/dietStorage";
import "./diet.css";

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DietLoadingSkeleton() {
  return (
    <div className="diet-loading-shell" aria-hidden="true">
      <Skeleton className="diet-loading-skeleton diet-loading-skeleton--hero" />
      <div className="diet-loading-grid">
        <Skeleton className="diet-loading-skeleton diet-loading-skeleton--card" />
        <Skeleton className="diet-loading-skeleton diet-loading-skeleton--card" />
        <Skeleton className="diet-loading-skeleton diet-loading-skeleton--card" />
      </div>
      <Skeleton className="diet-loading-skeleton diet-loading-skeleton--table" />
    </div>
  );
}

function DietPage() {
  const [diet, setDiet] = useState(() => loadDietProtocol());
  const [history, setHistory] = useState(() => loadDietHistory());
  const [mealLogs, setMealLogs] = useState(() => loadDietMealLogs());
  const [feedback, setFeedback] = useState("");
  const [selectedDayId, setSelectedDayId] = useState("segunda");
  const [isHydrating, setIsHydrating] = useState(true);

  const metrics = useMemo(() => getDietMetrics(diet, history), [diet, history]);
  const selectedDayPlan =
    diet.dayPlans?.find((day) => day.id === selectedDayId) || diet.dayPlans?.[0] || {
      id: "segunda",
      name: "Segunda",
      meals: diet.meals || [],
    };
  const activeDayMeals = selectedDayPlan.meals.filter((meal) => meal.enabled).length;
  const selectedDayLogs = mealLogs
    .filter((log) => log.dayId === selectedDayId)
    .sort((a, b) => new Date(b.createdAt || b.performedAt || 0) - new Date(a.createdAt || a.performedAt || 0))
    .slice(0, 8);
  const completedMealLogs = mealLogs.filter((log) => log.status === "done").length;
  const missedMealLogs = mealLogs.filter((log) => log.status === "missed").length;

  useEffect(() => {
    let ignore = false;

    async function hydrateDiet() {
      setIsHydrating(true);
      const [dietResult, historyResult, logResult] = await Promise.all([
        hydrateDietProtocolFromApi(),
        hydrateDietHistoryFromApi(),
        hydrateDietMealLogsFromApi(),
      ]);

      if (ignore) return;

      if (!dietResult.error) {
        setDiet(dietResult.diet);
      }

      if (!historyResult.error) {
        setHistory(historyResult.history);
      }

      if (!logResult.error) {
        setMealLogs(logResult.logs);
      }

      setIsHydrating(false);
    }

    hydrateDiet();

    return () => {
      ignore = true;
    };
  }, []);

  function updateDietField(field, value) {
    setDiet((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateMealField(dayId, mealId, field, value) {
    setDiet((current) => ({
      ...current,
      dayPlans: (current.dayPlans || []).map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: (day.meals || []).map((meal) =>
                meal.id === mealId
                  ? {
                      ...meal,
                      [field]: value,
                      ...(field === "description" ? { foods: value } : {}),
                    }
                  : meal
              ),
            }
          : day
      ),
    }));
  }

  function toggleMeal(dayId, mealId) {
    setDiet((current) => ({
      ...current,
      dayPlans: (current.dayPlans || []).map((day) =>
        day.id === dayId
          ? {
              ...day,
              meals: (day.meals || []).map((meal) =>
                meal.id === mealId ? { ...meal, enabled: !meal.enabled } : meal
              ),
            }
          : day
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
    setFeedback("Dieta encerrada e movida para o historico. Novo plano liberado.");
  }

  function handleReset() {
    const resetDiet = resetDietState();
    setDiet(resetDiet);
    setHistory([]);
    setMealLogs([]);
    setFeedback("Dietas resetadas com sucesso.");
  }

  return (
    <section className="diet-page">
      <section className="hero-card">
        <span className="eyebrow">Protocolo alimentar</span>
        <h2 className="hero-title">
          Organize a dieta atual e acompanhe aderencia e historico do ciclo.
        </h2>
        <p className="hero-description">
          Agora a area de dieta mostra o plano atual, os registros de refeicao ja salvos e o historico
          das dietas encerradas em um formato mais operacional.
        </p>

        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={handleSave}>
            Salvar dieta
          </button>

          <button type="button" className="secondary-button" onClick={handleCloseDiet}>
            Encerrar dieta
          </button>

          <button type="button" className="ghost-button" onClick={handleLoadExample}>
            Carregar exemplo
          </button>

          <button type="button" className="ghost-button" onClick={handleReset}>
            Resetar dietas
          </button>
        </div>

        {isHydrating ? <DietLoadingSkeleton /> : null}
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
            <p className="card-subtitle">Dados principais do ciclo alimentar em andamento.</p>
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
              placeholder="Ex.: Superavit controlado para massa magra"
              value={diet.nutritionalGoal}
              onChange={(event) => updateDietField("nutritionalGoal", event.target.value)}
            />
          </div>
        </div>

        <div className="form-grid grid-2 mt-16">
          <div className="input-group">
            <label className="input-label">Data de inicio</label>
            <input
              className="input-field"
              type="date"
              value={diet.startDate}
              onChange={(event) => updateDietField("startDate", event.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Data final</label>
            <input
              className="input-field"
              type="date"
              value={diet.endDate}
              onChange={(event) => updateDietField("endDate", event.target.value)}
            />
          </div>
        </div>

        <div className="form-grid grid-2 mt-16">
          <div className="input-group">
            <label className="input-label">Refeicoes recomendadas</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 5"
              value={diet.recommendedMeals}
              onChange={(event) => updateDietField("recommendedMeals", event.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Disponibilidade do usuario</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 4 refeicoes por dia"
              value={diet.userAvailableMeals}
              onChange={(event) => updateDietField("userAvailableMeals", event.target.value)}
            />
          </div>
        </div>

        <div className="input-group mt-16">
          <label className="input-label">Orientacoes do plano</label>
          <textarea
            className="textarea-field"
            placeholder="Orientacoes gerais do plano, aderencia, preferencias e cuidados."
            value={diet.guidance || ""}
            onChange={(event) => updateDietField("guidance", event.target.value)}
          />
        </div>
      </section>

      <section className="diet-meals-grid" aria-label="Refeicoes do protocolo por dia">
        <article className="glass-card card-padding diet-day-panel">
          <div className="card-header">
            <div>
              <h3 className="card-title">Refeicoes do protocolo</h3>
              <p className="card-subtitle">
                Selecione o dia para consultar a dieta e o volume de refeicoes ativas nesse bloco.
              </p>
            </div>
            <span className="badge badge-primary">{activeDayMeals} ativas</span>
          </div>

          <nav className="diet-week-tabs" role="tablist" aria-label="Dias da dieta">
            {dietDays.map((day) => {
              const dayPlan = diet.dayPlans?.find((item) => item.id === day.id);
              const enabledMeals = (dayPlan?.meals || []).filter((meal) => meal.enabled).length;

              return (
                <button
                  key={day.id}
                  type="button"
                  className={selectedDayId === day.id ? "is-selected" : ""}
                  onClick={() => setSelectedDayId(day.id)}
                >
                  <strong>{day.short}</strong>
                  <span>{day.name}</span>
                  <em>{enabledMeals} refeicoes</em>
                </button>
              );
            })}
          </nav>

          <div className="diet-selected-day-summary">
            <div>
              <span>Dia selecionado</span>
              <strong>Dieta de {selectedDayPlan.name}</strong>
            </div>
            <div>
              <span>Refeicoes ativas</span>
              <strong>{activeDayMeals}/{selectedDayPlan.meals.length}</strong>
            </div>
          </div>
        </article>

        {selectedDayPlan.meals.map((meal) => (
          <article
            key={`${selectedDayPlan.id}-${meal.id}`}
            className={`glass-card card-padding diet-meal-card ${meal.enabled ? "is-enabled" : "is-disabled"}`}
          >
            <div className="card-header">
              <div>
                <h3 className="card-title">{meal.name}</h3>
                <p className="card-subtitle">
                  {selectedDayPlan.name} | estrutura da refeicao dentro do plano atual.
                </p>
              </div>
              <button
                type="button"
                className="diet-meal-toggle"
                onClick={() => toggleMeal(selectedDayPlan.id, meal.id)}
              >
                {meal.enabled ? "Habilitada" : "Desabilitada"}
              </button>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Nome da refeicao</label>
                <input
                  className="input-field"
                  type="text"
                  value={meal.name}
                  onChange={(event) =>
                    updateMealField(selectedDayPlan.id, meal.id, "name", event.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label className="input-label">Descricao</label>
                <textarea
                  className="textarea-field diet-meal-description"
                  placeholder="Ex.: Frango, arroz, legumes e fruta."
                  value={meal.description}
                  onChange={(event) =>
                    updateMealField(selectedDayPlan.id, meal.id, "description", event.target.value)
                  }
                />
              </div>

              <div className="diet-macro-grid">
                <div className="input-group">
                  <label className="input-label">Calorias</label>
                  <input
                    className="input-field"
                    value={meal.calories}
                    onChange={(event) =>
                      updateMealField(selectedDayPlan.id, meal.id, "calories", event.target.value)
                    }
                    placeholder="kcal"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Proteina</label>
                  <input
                    className="input-field"
                    value={meal.protein}
                    onChange={(event) =>
                      updateMealField(selectedDayPlan.id, meal.id, "protein", event.target.value)
                    }
                    placeholder="g"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Carbo</label>
                  <input
                    className="input-field"
                    value={meal.carbs}
                    onChange={(event) =>
                      updateMealField(selectedDayPlan.id, meal.id, "carbs", event.target.value)
                    }
                    placeholder="g"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Gorduras</label>
                  <input
                    className="input-field"
                    value={meal.fats}
                    onChange={(event) =>
                      updateMealField(selectedDayPlan.id, meal.id, "fats", event.target.value)
                    }
                    placeholder="g"
                  />
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Aderencia por refeicao</h3>
            <p className="card-subtitle">
              Historico das refeicoes registradas para o dia selecionado, com status e horario salvo.
            </p>
          </div>
          <span className="badge badge-primary">{selectedDayLogs.length} registros</span>
        </div>

        <div className="diet-log-summary">
          <article className="metric-card">
            <div className="metric-label">Concluidas</div>
            <div className="metric-value">{completedMealLogs}</div>
            <div className="metric-trend">Refeicoes marcadas como feitas</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Gaps</div>
            <div className="metric-value">{missedMealLogs}</div>
            <div className="metric-trend">Refeicoes registradas como nao feitas</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Dia filtrado</div>
            <div className="metric-value">{selectedDayPlan.name}</div>
            <div className="metric-trend">{activeDayMeals} refeicoes ativas previstas</div>
          </article>
        </div>

        {selectedDayLogs.length === 0 ? (
          <div className="diet-empty-history">
            Ainda nao ha registros de refeicao para {selectedDayPlan.name}. Conforme a dieta for sendo usada, os logs vao aparecer aqui.
          </div>
        ) : (
          <div className="diet-history-table-shell">
            <Table className="diet-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Refeicao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedDayLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.logDate || "--"}</TableCell>
                    <TableCell>{log.mealName || log.slotId}</TableCell>
                    <TableCell>
                      <span className={`diet-log-pill ${log.status === "done" ? "is-done" : "is-missed"}`}>
                        {log.status === "done" ? "Feita" : "Nao feita"}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(log.performedAt || log.createdAt || log.scheduledAt)}</TableCell>
                    <TableCell>{log.source || "manual"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Historico de dietas</h3>
            <p className="card-subtitle">Planos anteriores encerrados e salvos para consulta.</p>
          </div>
          <span className="badge badge-primary">{history.length}</span>
        </div>

        {history.length === 0 ? (
          <div className="diet-empty-history">
            Ainda nao existem dietas finalizadas. Quando voce encerrar a dieta atual, ela aparecera aqui.
          </div>
        ) : (
          <div className="diet-history-table-shell">
            <Table className="diet-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Dieta</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Refeicoes</TableHead>
                  <TableHead>Fechada em</TableHead>
                  <TableHead className="diet-history-table__notes-head">Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title || "Dieta sem nome"}</TableCell>
                    <TableCell>
                      {item.startDate || "--"} ate {item.endDate || "--"}
                    </TableCell>
                    <TableCell>{item.nutritionalGoal || "--"}</TableCell>
                    <TableCell>{(item.meals || []).filter((meal) => meal.enabled).length}</TableCell>
                    <TableCell>
                      {item?.metadata?.closedAt
                        ? new Date(item.metadata.closedAt).toLocaleString("pt-BR")
                        : "--"}
                    </TableCell>
                    <TableCell className="diet-history-table__notes-cell">
                      <strong>{item.preferenceNotes || item.restrictionNotes || "Sem observacoes registradas"}</strong>
                      <span>{item.guidance || "Sem orientacoes adicionais salvas."}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}

export default DietPage;
