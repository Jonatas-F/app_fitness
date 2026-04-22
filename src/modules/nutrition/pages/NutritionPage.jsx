import { useEffect, useState } from "react";
import { loadCheckins } from "../../../data/checkinStorage";
import {
  dietDays,
  getDietMetrics,
  hydrateDietHistoryFromApi,
  hydrateDietMealLogsFromApi,
  hydrateDietProtocolFromApi,
  loadDietHistory,
  loadDietMealLogs,
  loadDietProtocol,
  saveDietMealLog,
  saveDietProtocol,
} from "../../../data/dietStorage";
import "./NutritionPage.css";

function parseNumeric(value) {
  const normalized = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLatestCompletedCheckin() {
  return loadCheckins().find((item) => item.status !== "missed");
}

function getWaterRecommendation(checkin) {
  if (!checkin) {
    return {
      value: "--",
      trend: "Complete um check-in para estimar",
      detail: "A meta final deve ser definida pelo Personal Virtual.",
    };
  }

  const weight = parseNumeric(checkin.weight);
  const bodyFat = parseNumeric(checkin.bodyFat);
  const muscleMass = parseNumeric(checkin.muscleMass);

  if (!weight) {
    return {
      value: "--",
      trend: "Peso nao informado no check-in",
      detail: "Peso, altura e bioimpedancia melhoram a recomendacao.",
    };
  }

  let liters = weight * 0.035;

  if (bodyFat && bodyFat > 28) {
    liters += 0.2;
  }

  if (muscleMass && muscleMass > weight * 0.45) {
    liters += 0.2;
  }

  const rounded = Math.round(liters * 10) / 10;

  return {
    value: `${rounded.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} L`,
    liters: rounded,
    trend: "Estimativa pelo ultimo check-in",
    detail: `Base: ${checkin.weight || "--"} kg${checkin.bodyFat ? `, gordura ${checkin.bodyFat}` : ""}${
      checkin.muscleMass ? `, massa muscular ${checkin.muscleMass}` : ""
    }.`,
  };
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function minutesToTime(value) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatDateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

function getTodayDietDayId() {
  const ids = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  return ids[new Date().getDay()];
}

function getDateTimeFromDateAndTime(dateKey, timeValue) {
  if (!dateKey || !timeValue) return "";
  return new Date(`${dateKey}T${timeValue}:00`).toISOString();
}

function formatDateShort(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CheckIcon() {
  return (
    <span className="nutrition-check-icon" aria-hidden="true">
      ✓
    </span>
  );
}

function getTimeInputValue(value, fallback = "") {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCurrentTimeInputValue() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getMealSchedule(meals, checkin) {
  const enabledMeals = (meals || []).filter((meal) => meal.enabled);
  const firstMealMinutes = timeToMinutes(checkin?.firstMealTime);
  const lastMealMinutes = timeToMinutes(checkin?.lastMealTime);

  if (!enabledMeals.length || firstMealMinutes === null || lastMealMinutes === null) {
    return {};
  }

  const windowMinutes =
    lastMealMinutes >= firstMealMinutes
      ? lastMealMinutes - firstMealMinutes
      : lastMealMinutes + 1440 - firstMealMinutes;
  const step = enabledMeals.length > 1 ? windowMinutes / (enabledMeals.length - 1) : 0;

  return enabledMeals.reduce((acc, meal, index) => {
    acc[meal.id] = minutesToTime(firstMealMinutes + step * index);
    return acc;
  }, {});
}

function getWaterSchedule(waterRecommendation, checkin) {
  const wakeMinutes = timeToMinutes(checkin?.wakeTime);
  const sleepMinutes = timeToMinutes(checkin?.sleepTime);

  if (!waterRecommendation.liters || wakeMinutes === null || sleepMinutes === null) {
    return {
      portions: "--",
      window: "Preencha acordar e dormir no check-in.",
      detail: "As notificacoes de agua usam essa janela quando estiver preenchida.",
    };
  }

  const totalMl = Math.round(waterRecommendation.liters * 1000);
  const portionMl = 400;
  const portions = Math.max(3, Math.ceil(totalMl / portionMl));
  const windowMinutes =
    sleepMinutes >= wakeMinutes ? sleepMinutes - wakeMinutes : sleepMinutes + 1440 - wakeMinutes;
  const interval = portions > 1 ? Math.round(windowMinutes / (portions - 1)) : windowMinutes;

  return {
    portions: `${portions} lembretes`,
    window: `${minutesToTime(wakeMinutes)} ate ${minutesToTime(sleepMinutes)}`,
    detail: `Aproximadamente ${Math.round(totalMl / portions)} ml a cada ${interval} min.`,
  };
}

function NutritionCollapsible({ eyebrow, title, summary, badge, children }) {
  return (
    <details className="nutrition-collapsible glass-panel">
      <summary className="nutrition-collapsible__summary">
        <span className="nutrition-collapsible__icon">+</span>
        <span>
          {eyebrow ? <small>{eyebrow}</small> : null}
          <strong>{title}</strong>
          {summary ? <em>{summary}</em> : null}
        </span>
        {badge ? <mark>{badge}</mark> : null}
      </summary>
      <div className="nutrition-collapsible__body">{children}</div>
    </details>
  );
}

export default function NutritionPage() {
  const [diet, setDiet] = useState(() => loadDietProtocol());
  const [dietHistory, setDietHistory] = useState(() => loadDietHistory());
  const [mealLogs, setMealLogs] = useState(() => loadDietMealLogs());
  const [feedback, setFeedback] = useState("");
  const [selectedDayId, setSelectedDayId] = useState("segunda");
  const [openMeals, setOpenMeals] = useState([]);
  const [mealCompletionModal, setMealCompletionModal] = useState(null);
  const metrics = getDietMetrics(diet, dietHistory);
  const latestCheckin = getLatestCompletedCheckin();
  const waterRecommendation = getWaterRecommendation(latestCheckin);
  const selectedDayPlan =
    diet.dayPlans?.find((day) => day.id === selectedDayId) ||
    diet.dayPlans?.[0] || {
      id: "segunda",
      name: "Segunda",
      meals: diet.meals || [],
    };
  const selectedDayActiveMeals = selectedDayPlan.meals.filter((meal) => meal.enabled).length;
  const mealSchedule = getMealSchedule(selectedDayPlan.meals, latestCheckin);
  const waterSchedule = getWaterSchedule(waterRecommendation, latestCheckin);
  const todayKey = formatDateKey();
  const mealLogMap = new Map(
    mealLogs.map((log) => [
      `${log.dayId}-${log.slotId}-${log.logDate}`,
      log,
    ])
  );
  const selectedDayMealLogs = mealLogs.filter((log) => log.dayId === selectedDayId).slice(0, 8);
  const recentMealCalendar = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - index));
    const key = formatDateKey(date);
    const logs = mealLogs.filter((log) => log.logDate === key);
    return {
      key,
      label: formatDateShort(key),
      completed: logs.filter((log) => log.status === "completed" || log.status === "auto_completed").length,
      automatic: logs.filter((log) => log.source === "automatic").length,
    };
  });
  const nutritionMetrics = [
    metrics[0],
    {
      label: "Meta de agua",
      value: waterRecommendation.value,
      trend: waterRecommendation.trend,
      detail: waterRecommendation.detail,
    },
    ...metrics.slice(1),
  ];

  useEffect(() => {
    let ignore = false;

    async function hydrateDiet() {
      const result = await hydrateDietProtocolFromApi();
      const historyResult = await hydrateDietHistoryFromApi();
      const mealLogsResult = await hydrateDietMealLogsFromApi();

      if (!ignore && !result.error) {
        setDiet(result.diet);
      }

      if (!ignore && !historyResult.error) {
        setDietHistory(historyResult.history || loadDietHistory());
      }

      if (!ignore && !mealLogsResult.error) {
        setMealLogs(mealLogsResult.logs || loadDietMealLogs());
      }
    }

    hydrateDiet();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const todayDayId = getTodayDietDayId();
    const todayPlan = diet.dayPlans?.find((day) => day.id === todayDayId);
    const todaySchedule = getMealSchedule(todayPlan?.meals || [], latestCheckin);
    const now = new Date();
    let cancelled = false;

    async function registerDueMeals() {
      for (const meal of todayPlan?.meals || []) {
        if (!meal.enabled || !todaySchedule[meal.id]) continue;

        const scheduledAt = getDateTimeFromDateAndTime(todayKey, todaySchedule[meal.id]);
        if (!scheduledAt || new Date(scheduledAt) > now) continue;

        const logKey = `${todayDayId}-${meal.id}-${todayKey}`;
        if (mealLogMap.has(logKey)) continue;

        const saved = await saveDietMealLog({
          dietPlanId: diet.id,
          dayId: todayDayId,
          slotId: meal.id,
          mealName: meal.name,
          logDate: todayKey,
          scheduledAt,
          performedAt: scheduledAt,
          status: "auto_completed",
          source: "automatic",
          payload: {
            reason: "Registro automatico criado porque o horario sugerido ja passou sem confirmacao manual.",
            suggestedTime: todaySchedule[meal.id],
          },
        });

        if (!cancelled) {
          setMealLogs((current) => [
            saved,
            ...current.filter(
              (item) => `${item.dayId}-${item.slotId}-${item.logDate}` !== `${saved.dayId}-${saved.slotId}-${saved.logDate}`
            ),
          ]);
        }
      }
    }

    registerDueMeals();

    return () => {
      cancelled = true;
    };
  }, [diet, latestCheckin, todayKey]);

  function updateDiet(nextDiet) {
    setDiet(saveDietProtocol(nextDiet));
  }

  function handleDietField(field, value) {
    updateDiet({ ...diet, [field]: value });
  }

  function handleMealField(dayId, mealId, field, value) {
    const nextDayPlans = (diet.dayPlans || dietDays).map((day) =>
      day.id === dayId
        ? {
            ...day,
            meals: (day.meals || []).map((meal) =>
              meal.id === mealId
                ? {
                    ...meal,
                    [field]: value,
                    ...(field === "foods" ? { description: value } : {}),
                  }
                : meal
            ),
          }
        : day
    );

    updateDiet({
      ...diet,
      dayPlans: nextDayPlans,
      meals: nextDayPlans.find((day) => day.id === selectedDayId)?.meals || diet.meals,
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

  function openMealDoneModal(meal) {
    const suggestedTime = mealSchedule[meal.id] || meal.time || "";
    const mealLogKey = `${selectedDayPlan.id}-${meal.id}-${todayKey}`;
    const mealLog = mealLogMap.get(mealLogKey);

    setMealCompletionModal({
      meal,
      dayId: selectedDayPlan.id,
      dayName: selectedDayPlan.name,
      suggestedTime,
      existingLog: mealLog || null,
      performedTime: getTimeInputValue(mealLog?.performedAt || mealLog?.scheduledAt, suggestedTime || getCurrentTimeInputValue()),
    });
  }

  function closeMealDoneModal() {
    setMealCompletionModal(null);
  }

  async function confirmMealDone() {
    if (!mealCompletionModal?.meal) return;

    const meal = mealCompletionModal.meal;
    const suggestedTime = mealCompletionModal.suggestedTime || "";
    const performedTime = mealCompletionModal.performedTime || suggestedTime || "12:00";
    const performedAt = getDateTimeFromDateAndTime(todayKey, performedTime);
    const saved = await saveDietMealLog({
      dietPlanId: diet.id,
      dayId: mealCompletionModal.dayId,
      slotId: meal.id,
      mealName: meal.name,
      logDate: todayKey,
      scheduledAt: suggestedTime ? getDateTimeFromDateAndTime(todayKey, suggestedTime) : "",
      performedAt,
      status: "completed",
      source: "manual",
      payload: {
        suggestedTime,
        selectedDayName: mealCompletionModal.dayName,
        previousPerformedAt: mealCompletionModal.existingLog?.performedAt || null,
        foods: meal.foods,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
      },
    });

    setMealLogs((current) => [
      saved,
      ...current.filter((item) => `${item.dayId}-${item.slotId}-${item.logDate}` !== `${saved.dayId}-${saved.slotId}-${saved.logDate}`),
    ]);
    setFeedback(`${meal.name} registrada como realizada as ${formatTime(saved.performedAt)}.`);
    closeMealDoneModal();
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
        {nutritionMetrics.map((item) => (
          <article
            key={item.label}
            className={`module-stat glass-panel ${item.label === "Meta de agua" ? "nutrition-water-card" : ""}`}
          >
            <span className="module-stat__label">{item.label}</span>
            <strong className="module-stat__value">{item.value}</strong>
            <span className="module-stat__helper">{item.trend}</span>
            {item.detail ? <small>{item.detail}</small> : null}
          </article>
        ))}
      </section>

      <NutritionCollapsible
        eyebrow="Historico"
        title="Calendario alimentar"
        summary="Refeicoes realizadas, automaticas e dietas anteriores ficam registradas para consulta."
        badge={`${mealLogs.length} registros`}
      >
        <section className="nutrition-history-panel">
          <div>
            <h2>Ultimos registros de refeicao</h2>
            <p>
              Dias com confirmacao manual ou automatica alimentam o dashboard, check-ins e futuras analises do Personal Virtual.
            </p>
          </div>

          <div className="nutrition-meal-calendar">
            {recentMealCalendar.map((day) => (
              <article
                key={day.key}
                className={`nutrition-meal-calendar__day ${day.completed ? "has-meals" : "is-empty"}`}
              >
                <span>{day.label}</span>
                <strong>{day.completed}</strong>
                <small>{day.automatic ? `${day.automatic} auto` : "manual"}</small>
              </article>
            ))}
          </div>

          <div className="nutrition-history-list">
            <h3>Dietas anteriores</h3>
            {dietHistory.length ? (
              dietHistory.slice(0, 5).map((item) => (
                <article key={item.id || item.metadata?.closedAt}>
                  <strong>{item.title || "Dieta arquivada"}</strong>
                  <span>
                    {item.startDate || "--"} ate {item.endDate || "--"}
                  </span>
                </article>
              ))
            ) : (
              <p>Nenhuma dieta anterior arquivada ainda.</p>
            )}
          </div>
        </section>
      </NutritionCollapsible>

      <NutritionCollapsible
        eyebrow="Config"
        title="Agenda alimentar e restricoes"
        summary="Disponibilidade de refeicoes, restricoes e preferencias."
        badge={`${diet.userAvailableMeals || "--"} refeicoes`}
      >
      <section className="nutrition-config">
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
      </NutritionCollapsible>

      <NutritionCollapsible
        eyebrow="Refeicoes"
        title="Refeicoes do protocolo"
        summary="Selecione o dia da semana e abra somente a refeicao que deseja consultar ou ajustar."
        badge={`${selectedDayActiveMeals} ativas`}
      >
      <section className="nutrition-week-panel">
        <div>
          <h2>Dietas por dia da semana</h2>
          <p>
            A IA usa a variacao definida no check-in para decidir se repete pratos
            ao longo da semana ou cria mais diversidade entre os dias.
          </p>
        </div>

        <nav className="nutrition-week-tabs" role="tablist" aria-label="Dias da dieta">
          {dietDays.map((day) => {
            const dayPlan = diet.dayPlans?.find((item) => item.id === day.id);
            const enabledMeals = (dayPlan?.meals || []).filter((meal) => meal.enabled).length;

            return (
              <button
                key={day.id}
                type="button"
                className={selectedDayId === day.id ? "is-selected" : ""}
                onClick={() => {
                  setSelectedDayId(day.id);
                  setOpenMeals([]);
                }}
              >
                <strong>{day.short}</strong>
                <span>{day.name}</span>
                <em>{enabledMeals} refeicoes</em>
              </button>
            );
          })}
        </nav>

        <div className="nutrition-selected-day">
          <div>
            <span>Dia selecionado</span>
            <strong>Dieta de {selectedDayPlan.name}</strong>
          </div>
          <div>
            <span>Refeicoes ativas</span>
            <strong>{selectedDayActiveMeals}/{selectedDayPlan.meals.length}</strong>
          </div>
        </div>

        <div className="nutrition-schedule-summary">
          <article>
            <span>Janela alimentar</span>
            <strong>
              {latestCheckin?.firstMealTime && latestCheckin?.lastMealTime
                ? `${latestCheckin.firstMealTime} ate ${latestCheckin.lastMealTime}`
                : "Falta preencher"}
            </strong>
            <p>Usada para distribuir os horarios das refeicoes ativas.</p>
          </article>
          <article>
            <span>Agua no dia</span>
            <strong>{waterRecommendation.value}</strong>
            <p>
              {waterSchedule.portions} · {waterSchedule.window}
            </p>
          </article>
          <article>
            <span>Espacamento</span>
            <strong>{waterSchedule.detail}</strong>
            <p>Esses horarios alimentam as notificacoes configuradas.</p>
          </article>
        </div>
      </section>

      <section className="meal-grid">
        {selectedDayPlan.meals.map((meal) => {
          const mealLogKey = `${selectedDayPlan.id}-${meal.id}-${todayKey}`;
          const mealLog = mealLogMap.get(mealLogKey);
          const suggestedTime = mealSchedule[meal.id] || meal.time || "";

          return (
            <article
              key={`${selectedDayPlan.id}-${meal.id}`}
              className={`meal-card glass-panel ${meal.enabled ? "is-enabled" : "is-disabled"} ${
                openMeals.includes(meal.id) ? "is-open" : ""
              } ${mealLog ? "is-completed" : ""}`}
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
                  <p>
                    {mealLog
                      ? `Refeicao realizada ${formatTime(mealLog.performedAt || mealLog.scheduledAt)}`
                      : meal.enabled
                        ? "Habilitada no plano"
                        : "Desabilitada neste protocolo"}
                  </p>
                  <small>
                    {meal.enabled
                      ? suggestedTime
                        ? `Horario sugerido: ${suggestedTime}`
                        : "Horario pendente no check-in"
                      : "Sem horario neste protocolo"}
                  </small>
                </div>
              </button>
              <span className={mealLog ? "meal-card__status is-done" : "meal-card__status"}>
                {mealLog ? <CheckIcon /> : null}
                {mealLog ? "Realizada" : meal.enabled ? "Ativa" : "Inativa"}
              </span>
            </div>

            {openMeals.includes(meal.id) ? (
              <>
                <div className="meal-card__tracking">
                  <article>
                    <span>Horario recomendado</span>
                    <strong>{suggestedTime || "Pendente"}</strong>
                  </article>
                  <article>
                    <span>Status de hoje</span>
                    <strong>
                      {mealLog
                        ? `${mealLog.source === "automatic" ? "Automatico" : "Manual"} as ${formatTime(
                            mealLog.performedAt || mealLog.scheduledAt
                          )}`
                        : "Nao registrado"}
                    </strong>
                  </article>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!meal.enabled}
                    onClick={() => openMealDoneModal(meal)}
                  >
                    {mealLog ? "Atualizar refeicao realizada" : "Marcar refeicao realizada"}
                  </button>
                </div>

                <div className="meal-card__macros">
                  <label>
                    Calorias
                    <input
                      disabled={!meal.enabled}
                      value={meal.calories}
                      onChange={(event) =>
                        handleMealField(selectedDayPlan.id, meal.id, "calories", event.target.value)
                      }
                      placeholder="kcal"
                    />
                  </label>
                  <label>
                    Proteína
                    <input
                      disabled={!meal.enabled}
                      value={meal.protein}
                      onChange={(event) =>
                        handleMealField(selectedDayPlan.id, meal.id, "protein", event.target.value)
                      }
                      placeholder="g"
                    />
                  </label>
                  <label>
                    Carboidrato
                    <input
                      disabled={!meal.enabled}
                      value={meal.carbs}
                      onChange={(event) =>
                        handleMealField(selectedDayPlan.id, meal.id, "carbs", event.target.value)
                      }
                      placeholder="g"
                    />
                  </label>
                  <label>
                    Gorduras
                    <input
                      disabled={!meal.enabled}
                      value={meal.fats}
                      onChange={(event) =>
                        handleMealField(selectedDayPlan.id, meal.id, "fats", event.target.value)
                      }
                      placeholder="g"
                    />
                  </label>
                </div>

                <label className="meal-card__textarea">
                  Alimentos e quantidades
                  <textarea
                    disabled={!meal.enabled}
                    value={meal.foods}
                    onChange={(event) =>
                      handleMealField(selectedDayPlan.id, meal.id, "foods", event.target.value)
                    }
                    placeholder="O Personal Virtual preencherá os alimentos desta refeição."
                  />
                </label>

                <label className="meal-card__textarea">
                  Observações
                  <textarea
                    disabled={!meal.enabled}
                    value={meal.notes}
                    onChange={(event) =>
                      handleMealField(selectedDayPlan.id, meal.id, "notes", event.target.value)
                    }
                    placeholder="Substituições, horários, preparo..."
                  />
                </label>
              </>
            ) : null}
          </article>
          );
        })}
      </section>
      </NutritionCollapsible>

      {mealCompletionModal ? (
        <div className="nutrition-modal-backdrop" role="presentation" onClick={closeMealDoneModal}>
          <section
            className="nutrition-modal glass-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nutrition-meal-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <span>Registro de refeicao</span>
              <button type="button" onClick={closeMealDoneModal} aria-label="Fechar">
                x
              </button>
            </header>

            <div className="nutrition-modal__content">
              <div>
                <h2 id="nutrition-meal-modal-title">{mealCompletionModal.meal.name}</h2>
                <p>
                  {mealCompletionModal.dayName} · horario recomendado{" "}
                  <strong>{mealCompletionModal.suggestedTime || "pendente"}</strong>
                </p>
              </div>

              {mealCompletionModal.existingLog ? (
                <p className="nutrition-modal__notice">
                  Esta refeicao ja estava registrada as{" "}
                  {formatTime(mealCompletionModal.existingLog.performedAt || mealCompletionModal.existingLog.scheduledAt)}.
                  Ao confirmar, o horario sera substituido.
                </p>
              ) : null}

              <label>
                Horario em que a refeicao foi realizada
                <input
                  type="time"
                  value={mealCompletionModal.performedTime}
                  onChange={(event) =>
                    setMealCompletionModal((current) => ({
                      ...current,
                      performedTime: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <button type="button" className="secondary-button" onClick={closeMealDoneModal}>
                Cancelar
              </button>
              <button type="button" className="primary-button" onClick={confirmMealDone}>
                Confirmar refeicao
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
