import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusPill from "@/components/ui/StatusPill";
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
import "@/components/ModulePageLayout.css";
import "./NutritionPage.css";

// ── Calendar helpers ──────────────────────────────────────────────────────────

function buildDietCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDayNum = new Date(year, month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i), outside: true });
  }
  for (let d = 1; d <= lastDayNum; d++) {
    cells.push({ date: new Date(year, month, d), outside: false });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), outside: true });
  }
  return cells;
}

function getDietDayIdFromDate(date) {
  const map = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  return map[date.getDay()];
}

function getDietDayStatus(date, diet, mealLogs) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const d = new Date(date.getTime());
  d.setHours(12, 0, 0, 0);
  if (d > today) return "future";
  const dateStr = d.toISOString().slice(0, 10);
  const dayId = getDietDayIdFromDate(d);
  const dayPlan = diet.dayPlans?.find((p) => p.id === dayId);
  const enabledMeals = (dayPlan?.meals || []).filter((m) => m.enabled);
  if (!enabledMeals.length) return "rest";
  const hasLogs = mealLogs.some((log) => log.logDate === dateStr && log.dayId === dayId);
  return hasLogs ? "done" : "missed";
}

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
        <span className="nutrition-collapsible__icon"><ChevronDown aria-hidden="true" /></span>
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

function NutritionEmptyState({ title, description, helper }) {
  return (
    <div className="nutrition-empty-state app-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState("refeicoes");
  const [diet, setDiet] = useState(() => loadDietProtocol());
  const [dietHistory, setDietHistory] = useState(() => loadDietHistory());
  const [mealLogs, setMealLogs] = useState(() => loadDietMealLogs());
  const [feedback, setFeedback] = useState("");
  const [isRestoringDiet, setIsRestoringDiet] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState("segunda");
  // Solicitações de ajuste por refeição
  const [adjustmentText, setAdjustmentText] = useState({});
  const [adjustmentScope, setAdjustmentScope] = useState({});
  // Calendário retroativo
  const [mealCalendarDate, setMealCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [isRetroMealLogging, setIsRetroMealLogging] = useState(false);
  const [retroMealDate, setRetroMealDate] = useState(null);
  const [retroMealDayPlan, setRetroMealDayPlan] = useState(null);
  const [retroMealEntries, setRetroMealEntries] = useState([]);
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

  // ── Tour: abre o almoço (refeição obrigatória) quando o guided tour pede ──
  useEffect(() => {
    function onTourOpenMeal() {
      const days = diet.dayPlans || [];

      // Preferência: dia que tenha almoço habilitado; senão qualquer dia ativo
      const targetDay =
        days.find((d) => d.meals?.some((m) => m.id === "almoco" && m.enabled)) ||
        days.find((d) => d.meals?.some((m) => m.enabled)) ||
        days[0];
      if (!targetDay) return;

      setSelectedDayId(targetDay.id);

      // Abre especificamente o almoço (ou primeiro ativo como fallback)
      const meal =
        targetDay.meals?.find((m) => m.id === "almoco" && m.enabled) ||
        targetDay.meals?.find((m) => m.enabled);
      if (meal) {
        setOpenMeals((prev) =>
          prev.includes(meal.id) ? prev : [...prev, meal.id]
        );
      }
    }
    window.addEventListener("shape-certo-tour-open-meal", onTourOpenMeal);
    return () => window.removeEventListener("shape-certo-tour-open-meal", onTourOpenMeal);
  }, [diet]);

  function updateDiet(nextDiet) {
    setDiet(saveDietProtocol(nextDiet));
  }

  async function handleRestoreDietPlan(planId) {
    setIsRestoringDiet(planId);
    try {
      const { apiRequest } = await import("../../../services/api/client");
      await apiRequest(`/diets/restore/${planId}`, { method: "POST" });
      const { hydrateDietProtocolFromApi, hydrateDietHistoryFromApi } = await import("../../../data/dietStorage");
      const [protocolResult, historyResult] = await Promise.all([
        hydrateDietProtocolFromApi(),
        hydrateDietHistoryFromApi(),
      ]);
      if (!protocolResult.error) setDiet(protocolResult.diet);
      if (!historyResult.error) setDietHistory(historyResult.history);
      setFeedback("Protocolo de dieta restaurado com sucesso.");
    } catch (err) {
      setFeedback("Erro ao restaurar protocolo: " + (err.message || ""));
    } finally {
      setIsRestoringDiet(null);
    }
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

  function handleSendAdjustmentRequest(meal) {
    const text = adjustmentText[meal.id];
    const scope = adjustmentScope[meal.id] || "day";
    if (!text) return;
    const scopeLabel =
      scope === "all"
        ? `todos os "${meal.name}" da semana`
        : `${meal.name} de ${selectedDayPlan.name}`;
    setFeedback(
      `Solicitacao enviada para ${scopeLabel}: "${text}". O Personal Virtual vai processar e atualizar o plano.`
    );
    setAdjustmentText((prev) => ({ ...prev, [meal.id]: "" }));
  }

  function handleDietCalendarDayClick(date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return;
    const dateStr = date.toISOString().slice(0, 10);
    const dayId = getDietDayIdFromDate(date);
    const dayPlan = diet.dayPlans?.find((p) => p.id === dayId);
    if (!dayPlan) return;
    const enabledMeals = (dayPlan.meals || []).filter((m) => m.enabled);
    if (!enabledMeals.length) return;
    setRetroMealDate(dateStr);
    setRetroMealDayPlan(dayPlan);
    setRetroMealEntries(
      enabledMeals.map((meal) => {
        const existing = mealLogs.find(
          (l) => l.logDate === dateStr && l.slotId === meal.id && l.dayId === dayId
        );
        return {
          meal,
          done: existing
            ? ["completed", "done", "auto_completed"].includes(existing.status)
            : false,
          time: existing
            ? getTimeInputValue(existing.performedAt || existing.scheduledAt, "")
            : "",
          existingLog: existing || null,
        };
      })
    );
    setIsRetroMealLogging(true);
  }

  function handleRetroMealEntryChange(index, field, value) {
    setRetroMealEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    );
  }

  async function handleSaveRetroMealLogs() {
    if (!retroMealDate || !retroMealDayPlan) return;
    const saved = [];
    for (const entry of retroMealEntries) {
      if (!entry.done) continue;
      const performedAt = getDateTimeFromDateAndTime(retroMealDate, entry.time || "12:00");
      const log = await saveDietMealLog({
        dietPlanId: diet.id,
        dayId: retroMealDayPlan.id,
        slotId: entry.meal.id,
        mealName: entry.meal.name,
        logDate: retroMealDate,
        scheduledAt: performedAt,
        performedAt,
        status: "completed",
        source: "retroactive",
        payload: { retroactive: true },
      });
      saved.push(log);
    }
    if (saved.length) {
      setMealLogs((current) => {
        const withoutOld = current.filter(
          (l) =>
            !(
              l.logDate === retroMealDate &&
              l.dayId === retroMealDayPlan.id &&
              saved.some((s) => s.slotId === l.slotId)
            )
        );
        return [...saved, ...withoutOld].sort(
          (a, b) =>
            new Date(b.createdAt || b.performedAt || 0) -
            new Date(a.createdAt || a.performedAt || 0)
        );
      });
    }
    setIsRetroMealLogging(false);
    setFeedback(
      `${saved.length} refeicao(oes) registrada(s) para ${new Date(
        retroMealDate + "T12:00:00"
      ).toLocaleDateString("pt-BR")}.`
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
      <header className="nutrition-hero glass-panel" data-tour="diet-content">
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="nutrition-tabs-root">
        <TabsList className="nutrition-tabs dashboard-tabs" variant="line">
          <TabsTrigger value="refeicoes" className="nutrition-tab-trigger dashboard-tab-trigger">
            <strong>Refeicoes</strong>
            <StatusPill tone="neutral">{selectedDayActiveMeals} ativas</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="historico" className="nutrition-tab-trigger dashboard-tab-trigger">
            <strong>Historico</strong>
            <StatusPill tone="neutral">{mealLogs.length} registros</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="config" className="nutrition-tab-trigger dashboard-tab-trigger">
            <strong>Config</strong>
            <StatusPill tone="neutral">{diet.userAvailableMeals || "--"} refeicoes</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="calendario" className="nutrition-tab-trigger dashboard-tab-trigger">
            <strong>Calendario</strong>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="historico" className="nutrition-tab-panel dashboard-tab-panel">
        {/* === HISTORICO === */}
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
            <h3>Registros do dia selecionado</h3>
            {selectedDayMealLogs.length ? (
              selectedDayMealLogs.map((log) => (
                <article key={log.id || `${log.dayId}-${log.slotId}-${log.logDate}`}>
                  <strong>{log.mealName || "Refeicao registrada"}</strong>
                  <span>
                    {log.logDate}
                  </span>
                </article>
              ))
            ) : (
              <NutritionEmptyState
                title="Nenhuma refeicao registrada neste dia"
                description="Ao confirmar uma refeicao, ela aparece aqui e passa a alimentar o dashboard e a IA."
                helper="Use o botao de check nas refeicoes habilitadas para registrar a execucao."
              />
            )}
          </div>

          <div className="nutrition-history-list">
            <h3>Dietas anteriores</h3>
            {dietHistory.length ? (
              dietHistory.slice(0, 10).map((item) => (
                <article key={item.id || item.metadata?.closedAt} className="nutrition-protocol-history-item">
                  <div>
                    <strong>{item.title || "Dieta arquivada"}</strong>
                    <span>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                        : (item.startDate || "--")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={isRestoringDiet === item.id}
                    onClick={() => handleRestoreDietPlan(item.id)}
                  >
                    {isRestoringDiet === item.id ? "Restaurando..." : "Restaurar"}
                  </button>
                </article>
              ))
            ) : (
              <NutritionEmptyState
                title="Nenhuma dieta arquivada"
                description="Quando um protocolo alimentar for substituido, o historico antigo fica salvo aqui."
              />
            )}
          </div>
        </section>
        </TabsContent>

        <TabsContent value="config" className="nutrition-tab-panel dashboard-tab-panel">
        {/* === CONFIG === */}
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
        </TabsContent>

        <TabsContent value="refeicoes" className="nutrition-tab-panel dashboard-tab-panel">
        {/* === REFEICOES === */}
      <section className="nutrition-week-panel">
        <div>
          <h2>Dietas por dia da semana</h2>
          <p>
            A IA usa a variacao definida no check-in para decidir se repete pratos
            ao longo da semana ou cria mais diversidade entre os dias.
          </p>
        </div>

        <nav className="nutrition-week-tabs" role="tablist" aria-label="Dias da dieta" data-tour="diet-days">
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
        {selectedDayPlan.meals.map((meal, mealIndex) => {
          const mealLogKey = `${selectedDayPlan.id}-${meal.id}-${todayKey}`;
          const mealLog = mealLogMap.get(mealLogKey);
          const suggestedTime = mealSchedule[meal.id] || meal.time || "";

          return (
            <article
              key={`${selectedDayPlan.id}-${meal.id}`}
              data-tour={meal.id === "almoco" ? "diet-meal" : undefined}
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
                <span><ChevronDown aria-hidden="true" /></span>
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

                {/* ── Campos travados: somente o Personal Virtual pode editar ──── */}
                <div className="meal-card__ai-lock">
                  <span>🔒</span>
                  <span>Campos definidos pelo Personal Virtual — use o campo abaixo para solicitar ajustes</span>
                </div>

                <div className="meal-card__macros">
                  <label>
                    Calorias
                    <input
                      readOnly
                      value={meal.calories || ""}
                      className="meal-field--readonly"
                      placeholder="--"
                    />
                  </label>
                  <label>
                    Proteína
                    <input
                      readOnly
                      value={meal.protein || ""}
                      className="meal-field--readonly"
                      placeholder="--"
                    />
                  </label>
                  <label>
                    Carboidrato
                    <input
                      readOnly
                      value={meal.carbs || ""}
                      className="meal-field--readonly"
                      placeholder="--"
                    />
                  </label>
                  <label>
                    Gorduras
                    <input
                      readOnly
                      value={meal.fats || ""}
                      className="meal-field--readonly"
                      placeholder="--"
                    />
                  </label>
                </div>

                <label className="meal-card__textarea">
                  Alimentos e quantidades
                  <textarea
                    readOnly
                    value={meal.foods || ""}
                    className="meal-field--readonly"
                    placeholder="O Personal Virtual preenchera os alimentos desta refeicao."
                  />
                </label>

                <label className="meal-card__textarea">
                  Observacoes
                  <textarea
                    readOnly
                    value={meal.notes || ""}
                    className="meal-field--readonly"
                    placeholder="Substituicoes, horarios, preparo..."
                  />
                </label>

                {/* ── Solicitar ajuste ─────────────────────────────────────── */}
                <div className="meal-adjustment-request">
                  <p className="meal-adjustment-request__title">
                    Solicitar ajuste ao Personal Virtual
                  </p>
                  <textarea
                    className="meal-adjustment-request__textarea"
                    value={adjustmentText[meal.id] || ""}
                    onChange={(e) =>
                      setAdjustmentText((prev) => ({ ...prev, [meal.id]: e.target.value }))
                    }
                    placeholder="Ex.: Quero retirar a aveia e substituir por granola. Prefiro adicionar mais proteina..."
                  />
                  <div className="meal-adjustment-scope">
                    <label
                      className={`meal-adjustment-scope__option${
                        (adjustmentScope[meal.id] || "day") === "day" ? " is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`adj-scope-${meal.id}`}
                        value="day"
                        checked={(adjustmentScope[meal.id] || "day") === "day"}
                        onChange={() =>
                          setAdjustmentScope((prev) => ({ ...prev, [meal.id]: "day" }))
                        }
                      />
                      Apenas {selectedDayPlan.name}
                    </label>
                    <label
                      className={`meal-adjustment-scope__option${
                        adjustmentScope[meal.id] === "all" ? " is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`adj-scope-${meal.id}`}
                        value="all"
                        checked={adjustmentScope[meal.id] === "all"}
                        onChange={() =>
                          setAdjustmentScope((prev) => ({ ...prev, [meal.id]: "all" }))
                        }
                      />
                      Todos os {meal.name}
                    </label>
                  </div>
                  <button
                    type="button"
                    className="meal-adjustment-btn"
                    disabled={!adjustmentText[meal.id]}
                    onClick={() => handleSendAdjustmentRequest(meal)}
                  >
                    Solicitar ajuste
                  </button>
                </div>
              </>
            ) : null}
          </article>
          );
        })}
      </section>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            CALENDÁRIO — lançamento retroativo de refeições
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="calendario" className="nutrition-tab-panel dashboard-tab-panel">
          <div className="diet-calendar glass-panel">
            {/* Navegação de mês */}
            <div className="diet-calendar__nav">
              <button
                type="button"
                className="diet-calendar__nav-btn"
                onClick={() =>
                  setMealCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
              >
                ←
              </button>
              <strong className="diet-calendar__nav-title">
                {mealCalendarDate.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              <button
                type="button"
                className="diet-calendar__nav-btn"
                onClick={() =>
                  setMealCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
              >
                →
              </button>
            </div>

            {/* Grade 7 colunas */}
            <div className="diet-calendar__grid">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((d) => (
                <div key={d} className="diet-calendar-weekday">{d}</div>
              ))}

              {buildDietCalendarCells(
                mealCalendarDate.getFullYear(),
                mealCalendarDate.getMonth()
              ).map((cell, i) => {
                const today = new Date();
                const isToday =
                  !cell.outside &&
                  cell.date.getDate() === today.getDate() &&
                  cell.date.getMonth() === today.getMonth() &&
                  cell.date.getFullYear() === today.getFullYear();
                const status = cell.outside
                  ? null
                  : getDietDayStatus(cell.date, diet, mealLogs);
                const dayId = getDietDayIdFromDate(cell.date);
                const dayPlan = !cell.outside
                  ? diet.dayPlans?.find((p) => p.id === dayId)
                  : null;
                const enabledCount = (dayPlan?.meals || []).filter((m) => m.enabled).length;
                const isClickable =
                  !cell.outside &&
                  status !== null &&
                  status !== "rest" &&
                  status !== "future";

                return (
                  <div
                    key={i}
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    className={[
                      "diet-calendar-day",
                      cell.outside ? "diet-calendar-day--outside" : "",
                      isToday ? "is-today" : "",
                      status ? `is-${status}` : "",
                      isClickable ? "is-clickable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => isClickable && handleDietCalendarDayClick(cell.date)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      isClickable &&
                      handleDietCalendarDayClick(cell.date)
                    }
                    title={
                      !cell.outside && enabledCount
                        ? `${dayPlan?.name || ""} — ${enabledCount} refeicao(oes)`
                        : undefined
                    }
                  >
                    <span className="diet-calendar-day__num">{cell.date.getDate()}</span>
                    {!cell.outside && status === "done" && (
                      <span className="diet-calendar-day__dot" />
                    )}
                    {!cell.outside && enabledCount > 0 && (
                      <span className="diet-calendar-day__count">{enabledCount}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="diet-calendar__legend">
              <span className="diet-legend-item is-done">✓ Registrado</span>
              <span className="diet-legend-item is-missed">✗ Perdido</span>
              <span className="diet-legend-item is-future">○ Previsto</span>
              <span className="diet-legend-item is-rest">· Sem refeicoes</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modal retroativo de refeições ─────────────────────────────────── */}
      {isRetroMealLogging && retroMealDayPlan && (
        <div
          className="nutrition-modal-backdrop"
          role="presentation"
          onClick={() => setIsRetroMealLogging(false)}
        >
          <section
            className="nutrition-modal glass-panel"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <span>Registrar refeicoes retroativas</span>
                <strong>
                  {retroMealDayPlan.name} —{" "}
                  {retroMealDate
                    ? new Date(retroMealDate + "T12:00:00").toLocaleDateString("pt-BR")
                    : ""}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setIsRetroMealLogging(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>

            <div className="nutrition-modal__content retro-meal-list">
              <p className="retro-meal-hint">
                Marque as refeicoes realizadas e informe o horario aproximado. Os dados
                alimentarao o historico e os dashboards.
              </p>
              {retroMealEntries.map((entry, idx) => (
                <div key={entry.meal.id} className="retro-meal-row">
                  <label className="retro-meal-row__check">
                    <input
                      type="checkbox"
                      checked={entry.done}
                      onChange={(e) =>
                        handleRetroMealEntryChange(idx, "done", e.target.checked)
                      }
                    />
                    <span>{entry.meal.name}</span>
                    {entry.meal.calories ? (
                      <em>{entry.meal.calories} kcal</em>
                    ) : null}
                  </label>
                  {entry.done && (
                    <label className="retro-meal-row__time">
                      Horario
                      <input
                        type="time"
                        value={entry.time}
                        onChange={(e) =>
                          handleRetroMealEntryChange(idx, "time", e.target.value)
                        }
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>

            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setIsRetroMealLogging(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSaveRetroMealLogs}
                disabled={!retroMealEntries.some((e) => e.done)}
              >
                Salvar registros
              </button>
            </footer>
          </section>
        </div>
      )}

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
