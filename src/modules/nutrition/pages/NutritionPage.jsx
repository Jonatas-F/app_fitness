import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusPill from "@/components/ui/StatusPill";
import { PlanExportButton } from "@/components/PlanExportButton";
import DietPlanOverview from "@/components/plan/DietPlanOverview";
import MealTrackingView from "@/components/plan/MealTrackingView";
import AiGeneratingScreen from "@/components/shared/AiGeneratingScreen";
import { generateDietWithAi } from "../../../services/ai/diet.service";
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
      trend: "Peso não informado no check-in",
      detail: "Peso, altura e bioimpedância melhoram a recomendação.",
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
    trend: "Estimativa pelo último check-in",
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
      detail: "As notificações de água usam essa janela quando estiver preenchida.",
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
    window: `${minutesToTime(wakeMinutes)} até ${minutesToTime(sleepMinutes)}`,
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
  // Visão geral estilo PDF é o padrão; "Acompanhar refeições" abre a gestão completa.
  const [viewMode, setViewMode] = useState("overview"); // overview | track
  // Regeneração / ajuste da dieta
  const [showGen, setShowGen] = useState(false);
  const [dietStatus, setDietStatus] = useState("generating");
  const [dietError, setDietError] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState("");
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
      label: "Meta de água",
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
            reason: "Registro automático criado porque o horário sugerido já passou sem confirmação manual.",
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
      `Solicitação enviada para ${scopeLabel}: "${text}". O Personal Virtual vai processar e atualizar o plano.`
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
      `${saved.length} refeição(ões) registrada(s) para ${new Date(
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
    setFeedback(`${meal.name} registrada como realizada às ${formatTime(saved.performedAt)}.`);
    closeMealDoneModal();
  }


  // ── Ações da dieta: regenerar plano / ajustar (substituir, eliminar) ───────
  async function regenerateDiet(requestedDietChanges = "") {
    setDietError(null);
    setDietStatus("generating");
    setShowGen(true);
    try {
      await generateDietWithAi({
        persist: true,
        goal: latestCheckin?.goal || diet?.goal || "",
        keepDietProtocol: "nao",
        requestedDietChanges,
      });
      const fresh = await hydrateDietProtocolFromApi().catch(() => null);
      setDiet(fresh && !fresh.error && fresh.diet ? fresh.diet : loadDietProtocol());
      setDietStatus("ok");
    } catch (err) {
      setDietStatus("error");
      setDietError(err?.message || "Não foi possível gerar a dieta.");
    }
  }

  function handleApplyAdjust() {
    const text = adjustText.trim();
    if (!text) return;
    setAdjustOpen(false);
    setAdjustText("");
    regenerateDiet(text);
  }

  // Tela de geração (reaproveita o loader da IA, só a dieta)
  if (showGen) {
    return (
      <AiGeneratingScreen
        workoutEnabled={false}
        dietStatus={dietStatus}
        dietError={dietError}
        onRetryDiet={() => regenerateDiet()}
        onComplete={() => { setShowGen(false); setViewMode("overview"); }}
        completeLabel="Ver dieta atualizada →"
      />
    );
  }

  // Acompanhamento simples — só marcar refeições feitas + histórico
  if (viewMode === "track") {
    return (
      <section className="nutrition-page">
        <button type="button" className="plan-back-bar" onClick={() => setViewMode("overview")}>
          ← Voltar ao plano
        </button>
        <MealTrackingView diet={diet} />
      </section>
    );
  }

  // Padrão: visão geral estilo PDF + ações de ajuste
  return (
    <section className="nutrition-page">
      <DietPlanOverview
        diet={diet}
        checkin={latestCheckin}
        onTrack={() => setViewMode("track")}
        onRegenerate={() => regenerateDiet()}
        onAdjust={() => setAdjustOpen(true)}
      />

      {adjustOpen && (
        <div className="diet-adjust-overlay" role="dialog" aria-modal="true" onClick={() => setAdjustOpen(false)}>
          <div className="diet-adjust-panel glass-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Ajustar dieta</h3>
            <p>Descreva o que mudar — substituir um alimento, eliminar um ingrediente, pedir mais variedade. A IA regenera o plano mantendo seus macros.</p>
            <textarea
              rows={4}
              value={adjustText}
              onChange={(e) => setAdjustText(e.target.value)}
              placeholder="Ex: trocar frango por peixe no almoço; eliminar lactose; mais opções no café da manhã"
            />
            <div className="diet-adjust-actions">
              <button type="button" className="plan-cta plan-cta--ghost" onClick={() => { setAdjustOpen(false); setAdjustText(""); }}>
                Cancelar
              </button>
              <button type="button" className="plan-cta" onClick={handleApplyAdjust} disabled={!adjustText.trim()}>
                Aplicar e gerar →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
