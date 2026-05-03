import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusPill from "@/components/ui/StatusPill";
import Skeleton from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { workoutsViews } from "../../../data/appData";
import {
  getPreviousWorkoutSession,
  hydrateWorkoutExecutionFromApi,
  hydrateWorkoutSessionsFromApi,
  loadWorkoutExecution,
  loadWorkoutSessionHistory,
  saveWorkoutSession,
  saveWorkoutExecution,
  saveActiveSession,
  loadActiveSession,
  clearActiveSession,
} from "../../../data/workoutExecutionStorage";
import { getStoredApiUser } from "../../../services/api/client";
import { gymEquipmentCatalog } from "../../../data/gymEquipmentCatalog";
import { loadGymEquipmentSelection } from "../../../data/gymEquipmentStorage";

const ADMIN_PLAN_OVERRIDE_KEY = "shapeCertoAdminPlanOverride";

function getActivePlanId() {
  const override = localStorage.getItem(ADMIN_PLAN_OVERRIDE_KEY);
  if (override) return override;
  return getStoredApiUser()?.plan_type || "intermediario";
}

// ── Base dinâmica de aparelhos: construída a partir das configurações ─────────
function buildActiveExerciseGroups() {
  const activeIds = new Set(loadGymEquipmentSelection());
  return gymEquipmentCatalog
    .map((cat) => ({
      group: cat.title,
      exercises: cat.items
        .filter((item) => activeIds.has(item.id))
        .map((item) => item.name),
    }))
    .filter((cat) => cat.exercises.length > 0);
}

function createEditExercise(workoutId, name, sourceEx = null) {
  const prescribedSets = Number(sourceEx?.suggestedSets || 3);
  return {
    id: `${workoutId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    name,
    suggestedSets:      sourceEx?.suggestedSets || "3",
    suggestedReps:      sourceEx?.suggestedReps || "8-12",
    restSeconds:        sourceEx?.restSeconds    || 90,
    executionVideoUrl:  "",
    userVideoFileName:  "",
    aiFeedback:         "",
    notes:              sourceEx?.notes          || "",
    sets: Array.from({ length: 5 }, (_, i) => ({
      set:     i + 1,
      enabled: i < prescribedSets,
      weight:  "",
      reps:    "",
    })),
  };
}
import "./WorkoutsPage.css";

// ── Calendar helpers ──────────────────────────────────────────────────────────

function getWeekdayId(date) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getDay()];
}

function getDayStatus(date, plan, sessionHistory) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const d = new Date(date.getTime());
  d.setHours(12, 0, 0, 0);
  const dayId = getWeekdayId(d);
  const workout = plan.workouts.find((w) => w.id === dayId);
  if (!workout?.enabled) return "rest";
  if (d > today) return "planned";
  const dateStr = d.toISOString().slice(0, 10);
  const hasSession = sessionHistory.some(
    (s) => s.createdAt.slice(0, 10) === dateStr && s.workoutId === dayId
  );
  return hasSession ? "done" : "missed";
}

function buildCalendarCells(year, month) {
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

function getWorkoutView(pathname, workoutId) {
  if (workoutId) return "detail";
  if (pathname.endsWith("/historico")) return "history";
  if (pathname.endsWith("/gerar")) return "generate";
  return "list";
}

function getInitialWorkoutState() {
  const plan = loadWorkoutExecution();
  const selectedWorkoutId =
    plan.workouts.find((workout) => workout.enabled)?.id || plan.workouts[0]?.id || "";

  return { plan, selectedWorkoutId };
}

function getDayPrefix(title) {
  return title.slice(0, 3).toUpperCase();
}

function countCompletedExercises(workout) {
  return workout.exercises.filter((exercise) =>
    exercise.sets.some((set) => set.enabled !== false && (set.weight || set.reps))
  ).length;
}

function getEstimatedVolume(workout) {
  return workout.exercises.reduce(
    (sum, exercise) => sum + exercise.sets.filter((set) => set.enabled !== false).length,
    0
  );
}

function getExerciseSetCount(exercise) {
  return exercise.sets.filter((set) => set.enabled !== false).length;
}

function getExerciseRestSeconds(exercise) {
  const seconds = Number(exercise?.restSeconds || 90);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 90;
}

function formatTimer(totalSeconds) {
  const safeSeconds = Math.max(Number(totalSeconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatWorkoutDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function numberValue(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSessionVolume(session) {
  return session.exercises.reduce(
    (exerciseSum, exercise) =>
      exerciseSum +
      exercise.sets.reduce((setSum, set) => {
        if (set.enabled === false) return setSum;
        return setSum + numberValue(set.weight) * numberValue(set.reps);
      }, 0),
    0
  );
}

function getRegisteredSets(session) {
  return session.exercises.reduce(
    (exerciseSum, exercise) =>
      exerciseSum +
      exercise.sets.filter((set) => set.enabled !== false && (set.weight || set.reps)).length,
    0
  );
}

function getSessionDurationMinutes(session) {
  const startedAt = new Date(session.startedAt || session.createdAt);
  const finishedAt = new Date(session.createdAt);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(finishedAt.getTime())) {
    return "--";
  }

  const minutes = Math.max(Math.round((finishedAt - startedAt) / 60000), 1);
  return `${minutes} min`;
}

function formatExerciseSummary(session) {
  return session.exercises
    .slice(0, 2)
    .map((exercise) => exercise.name)
    .join(" • ");
}

function WorkoutEmptyState({ title, description }) {
  return (
    <div className="workout-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function WorkoutSessionHistoryTable({ sessions }) {
  return (
    <div className="workout-history-table-shell">
      <Table className="workout-history-table">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Treino</TableHead>
            <TableHead>Duração</TableHead>
            <TableHead>Séries</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead className="workout-history-table__summary-head">Resumo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>{formatWorkoutDate(session.createdAt)}</TableCell>
              <TableCell>{session.workoutTitle}</TableCell>
              <TableCell>{getSessionDurationMinutes(session)}</TableCell>
              <TableCell>{getRegisteredSets(session)}</TableCell>
              <TableCell>{Math.round(getSessionVolume(session))}</TableCell>
              <TableCell className="workout-history-table__summary-cell">
                <strong>{formatExerciseSummary(session) || "Sem exercícios registrados"}</strong>
                <span>
                  {session.exercises.length} exercício(s) no registro
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WorkoutLoadingSkeleton() {
  return (
    <div className="workout-loading-shell" aria-hidden="true">
      <Skeleton className="workout-loading-skeleton workout-loading-skeleton--hero" />
      <div className="workout-loading-grid">
        <Skeleton className="workout-loading-skeleton workout-loading-skeleton--stat" />
        <Skeleton className="workout-loading-skeleton workout-loading-skeleton--stat" />
        <Skeleton className="workout-loading-skeleton workout-loading-skeleton--stat" />
      </div>
      <Skeleton className="workout-loading-skeleton workout-loading-skeleton--table" />
    </div>
  );
}

function WorkoutExecutionSection() {
  const [activeTab, setActiveTab] = useState("treino");
  const isPro = getActivePlanId() === "pro";
  const [workoutState, setWorkoutState] = useState(() => getInitialWorkoutState());
  const [isEditingWorkout, setIsEditingWorkout] = useState(false);
  const [editExercises, setEditExercises] = useState([]);
  const [editReplacements, setEditReplacements] = useState({});
  const [pickerMode, setPickerMode] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [availableExerciseGroups, setAvailableExerciseGroups] = useState([]);
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [isRetroLogging, setIsRetroLogging] = useState(false);
  const [retroDate, setRetroDate] = useState(null);
  const [retroWorkout, setRetroWorkout] = useState(null);
  const [retroExercises, setRetroExercises] = useState([]);
  const [retroPickerMode, setRetroPickerMode] = useState(null); // { mode:'replace'|'add', index?:number }
  const [retroPickerSearch, setRetroPickerSearch] = useState("");
  const [sessionHistory, setSessionHistory] = useState(() => loadWorkoutSessionHistory());
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [isRestoringWorkout, setIsRestoringWorkout] = useState(null);
  const [activeSessionWorkoutId, setActiveSessionWorkoutId] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState("");
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(null);
  const [sessionExerciseIndex, setSessionExerciseIndex] = useState(0);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isHydrating, setIsHydrating] = useState(true);
  const [waitingForNextExercise, setWaitingForNextExercise] = useState(false);
  const { plan, selectedWorkoutId } = workoutState;
  const selectedWorkout =
    plan.workouts.find((workout) => workout.id === selectedWorkoutId) ||
    plan.workouts.find((workout) => workout.enabled) ||
    plan.workouts[0];
  const isSessionActive = activeSessionWorkoutId === selectedWorkout?.id;
  const selectedExercise =
    selectedWorkout?.exercises[sessionExerciseIndex] || selectedWorkout?.exercises[0];
  const selectedSet = selectedExercise?.sets[activeSetIndex] || selectedExercise?.sets[0];
  const previousSession = selectedWorkout ? getPreviousWorkoutSession(selectedWorkout.id) : null;
  const selectedWorkoutSessions = selectedWorkout
    ? sessionHistory.filter((session) => session.workoutId === selectedWorkout.id)
    : [];
  const recentSessions = selectedWorkoutSessions.slice(0, 6);
  const completedExercises = selectedWorkout ? countCompletedExercises(selectedWorkout) : 0;
  const estimatedVolume = selectedWorkout ? getEstimatedVolume(selectedWorkout) : 0;
  const adherence = Math.round(
    (completedExercises / Math.max(selectedWorkout?.exercises.length || 1, 1)) * 100
  );

  useEffect(() => {
    let ignore = false;

    async function hydrateWorkouts() {
      setIsHydrating(true);

      const [result, sessionResult, historyRes] = await Promise.all([
        hydrateWorkoutExecutionFromApi(),
        hydrateWorkoutSessionsFromApi(),
        import("../../../services/api/client").then(({ apiRequest }) =>
          import("../../../services/api/endpoints").then(({ apiEndpoints }) =>
            apiRequest(apiEndpoints.workoutHistory).catch(() => ({ history: [] }))
          )
        ),
      ]);

      if (ignore || result.error) {
        setIsHydrating(false);
        return;
      }

      const nextPlan = result.plan;
      const selectedId =
        nextPlan.workouts.find((workout) => workout.enabled)?.id ||
        nextPlan.workouts[0]?.id ||
        "";

      setWorkoutState({
        plan: nextPlan,
        selectedWorkoutId: selectedId,
      });
      if (!sessionResult.error) {
        setSessionHistory(sessionResult.sessions);
      }
      if (historyRes?.history) {
        setWorkoutHistory(historyRes.history);
      }
      setIsHydrating(false);
    }

    hydrateWorkouts();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!isSessionActive) return undefined;

    const timerId = window.setInterval(() => {
      setSessionElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isSessionActive]);

  useEffect(() => {
    if (!isSessionActive || restRemainingSeconds <= 0) return undefined;

    const timerId = window.setInterval(() => {
      setRestRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isSessionActive, restRemainingSeconds]);

  // Persiste estado da sessão para retomada posterior
  useEffect(() => {
    if (!isSessionActive || !selectedWorkout) return;
    saveActiveSession({
      workoutId:              selectedWorkout.id,
      exerciseIndex:          sessionExerciseIndex,
      setIndex:               activeSetIndex,
      elapsedSeconds:         sessionElapsedSeconds,
      startedAt:              sessionStartedAt,
      waitingForNextExercise,
    });
  }, [isSessionActive, sessionExerciseIndex, activeSetIndex, sessionElapsedSeconds, waitingForNextExercise]);

  function updatePlan(nextPlan) {
    setWorkoutState((current) => ({
      ...current,
      plan: saveWorkoutExecution(nextPlan),
    }));
  }

  function handleSelectWorkout(workout) {
    if (!workout.enabled) return;
    setWorkoutState((current) => ({
      ...current,
      selectedWorkoutId: workout.id,
    }));
    setExpandedExerciseIndex(null);
    setSessionExerciseIndex(0);
    setActiveSetIndex(0);
  }

  function handleExerciseChange(workoutId, exerciseId, field, value) {
    updatePlan({
      ...plan,
      workouts: plan.workouts.map((workout) =>
        workout.id !== workoutId
          ? workout
          : {
              ...workout,
              exercises: workout.exercises.map((exercise) =>
                exercise.id !== exerciseId ? exercise : { ...exercise, [field]: value }
              ),
            }
      ),
    });
  }

  function handleSetChange(workoutId, exerciseId, setIndex, field, value) {
    updatePlan({
      ...plan,
      workouts: plan.workouts.map((workout) =>
        workout.id !== workoutId
          ? workout
          : {
              ...workout,
              exercises: workout.exercises.map((exercise) =>
                exercise.id !== exerciseId
                  ? exercise
                  : {
                      ...exercise,
                      sets: exercise.sets.map((set, index) =>
                        index !== setIndex ? set : { ...set, [field]: value }
                      ),
                    }
              ),
            }
      ),
    });
  }

  function handleVideoUpload(workoutId, exerciseId, file) {
    if (!file) return;
    handleExerciseChange(workoutId, exerciseId, "userVideoFileName", file.name);
  }

  function handleStartWorkoutSession() {
    if (!selectedWorkout?.enabled) return;

    const saved = loadActiveSession(selectedWorkout.id);

    if (saved) {
      // Retoma de onde parou
      setSessionExerciseIndex(saved.exerciseIndex ?? 0);
      setActiveSetIndex(saved.setIndex ?? 0);
      setSessionElapsedSeconds(saved.elapsedSeconds ?? 0);
      setSessionStartedAt(saved.startedAt || new Date().toISOString());
      setWaitingForNextExercise(saved.waitingForNextExercise ?? false);
      setRestRemainingSeconds(0);
      setActiveSessionWorkoutId(selectedWorkout.id);
      setFeedback("Sessão retomada de onde parou.");
      return;
    }

    // Nova sessão — pré-preenche pesos da última sessão salva
    const prevSession = getPreviousWorkoutSession(selectedWorkout.id);
    if (prevSession) {
      const prefilled = {
        ...plan,
        workouts: plan.workouts.map((workout) => {
          if (workout.id !== selectedWorkout.id) return workout;
          return {
            ...workout,
            exercises: workout.exercises.map((exercise) => {
              const prevEx = prevSession.exercises?.find((e) => e.id === exercise.id);
              if (!prevEx) return exercise;
              return {
                ...exercise,
                sets: exercise.sets.map((set, i) => ({
                  ...set,
                  weight: set.weight || prevEx.sets?.[i]?.weight || "",
                  reps:   set.reps   || prevEx.sets?.[i]?.reps   || "",
                })),
              };
            }),
          };
        }),
      };
      updatePlan(prefilled);
    }

    setActiveSessionWorkoutId(selectedWorkout.id);
    setSessionStartedAt(new Date().toISOString());
    setSessionExerciseIndex(0);
    setActiveSetIndex(0);
    setSessionElapsedSeconds(0);
    setRestRemainingSeconds(0);
    setWaitingForNextExercise(false);
    setFeedback(`Sessão de ${selectedWorkout.title} iniciada.`);
  }

  function handleFinishWorkoutSession() {
    if (!selectedWorkout) return;
    const updatedHistory = saveWorkoutSession(selectedWorkout, { startedAt: sessionStartedAt });
    setSessionHistory(updatedHistory);
    clearActiveSession();
    setActiveSessionWorkoutId("");
    setSessionStartedAt("");
    setSessionElapsedSeconds(0);
    setRestRemainingSeconds(0);
    setWaitingForNextExercise(false);
    setFeedback(
      `${selectedWorkout.title} finalizado. A sessão foi salva, alimentou o dashboard e criou o registro diário automático.`
    );
  }

  function handleStartNextExercise() {
    setSessionExerciseIndex((i) => i + 1);
    setActiveSetIndex(0);
    setRestRemainingSeconds(0);
    setWaitingForNextExercise(false);
    setFeedback("Próximo exercício iniciado.");
  }

  function handleResetSession() {
    setSessionExerciseIndex(0);
    setActiveSetIndex(0);
    setSessionElapsedSeconds(0);
    setRestRemainingSeconds(0);
    setWaitingForNextExercise(false);
    clearActiveSession();
    setFeedback("Sessão resetada. Começando do início.");
  }

  function handleJumpToExercise(index) {
    setSessionExerciseIndex(index);
    setActiveSetIndex(0);
    setRestRemainingSeconds(0);
    setWaitingForNextExercise(false);
  }

  function handleMoveExercise(workoutId, exerciseId, direction) {
    const workout = plan.workouts.find((w) => w.id === workoutId);
    if (!workout) return;
    const idx = workout.exercises.findIndex((e) => e.id === exerciseId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= workout.exercises.length) return;
    const reordered = [...workout.exercises];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    updatePlan({
      ...plan,
      workouts: plan.workouts.map((w) =>
        w.id !== workoutId ? w : { ...w, exercises: reordered }
      ),
    });
  }

  // ── Edição de treino ────────────────────────────────────────────────────────

  function handleOpenEditWorkout() {
    setEditExercises(
      selectedWorkout.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }))
    );
    setEditReplacements({});
    setPickerMode(null);
    setPickerSearch("");
    setAvailableExerciseGroups(buildActiveExerciseGroups());
    setIsEditingWorkout(true);
  }

  function handleMoveEditExercise(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editExercises.length) return;
    const arr = [...editExercises];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setEditExercises(arr);
  }

  function handleRemoveEditExercise(idx) {
    setEditExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function handlePickExercise(name) {
    if (pickerMode?.mode === "replace") {
      const idx = pickerMode.index;
      const originalEx = editExercises[idx];
      const newEx = createEditExercise(selectedWorkout.id, name, originalEx);
      setEditReplacements((prev) => ({ ...prev, [originalEx.id]: name }));
      setEditExercises((prev) => prev.map((ex, i) => (i === idx ? newEx : ex)));
    } else {
      setEditExercises((prev) => [...prev, createEditExercise(selectedWorkout.id, name)]);
    }
    setPickerMode(null);
    setPickerSearch("");
  }

  function handleSaveEditedWorkout(scope) {
    if (scope === "day") {
      updatePlan({
        ...plan,
        workouts: plan.workouts.map((w) =>
          w.id === selectedWorkout.id ? { ...w, exercises: editExercises } : w
        ),
      });
    } else {
      // Propaga substituições e remoções para todos os outros treinos
      const origById = new Map(selectedWorkout.exercises.map((ex) => [ex.id, ex]));

      // mapa oldName → newName para substituições
      const nameReplacements = {};
      Object.entries(editReplacements).forEach(([origId, newName]) => {
        const origEx = origById.get(origId);
        if (origEx) nameReplacements[origEx.name] = newName;
      });

      // nomes dos exercícios removidos nesta edição
      const editIds = new Set(editExercises.map((ex) => ex.id));
      const removedNames = new Set(
        selectedWorkout.exercises
          .filter((ex) => !editIds.has(ex.id))
          .map((ex) => ex.name)
      );

      updatePlan({
        ...plan,
        workouts: plan.workouts.map((w) => {
          if (w.id === selectedWorkout.id) return { ...w, exercises: editExercises };
          const updated = w.exercises
            .filter((ex) => !removedNames.has(ex.name))
            .map((ex) => {
              if (nameReplacements[ex.name]) {
                return createEditExercise(w.id, nameReplacements[ex.name], ex);
              }
              return ex;
            });
          return { ...w, exercises: updated };
        }),
      });
    }

    setIsEditingWorkout(false);
    setEditExercises([]);
    setEditReplacements({});
    setPickerMode(null);
    setFeedback("Treino atualizado com sucesso.");
  }

  // ── Registro retroativo de sessão ─────────────────────────────────────────

  function handleCalendarDayClick(date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return;
    const dayId = getWeekdayId(date);
    const workout = plan.workouts.find((w) => w.id === dayId && w.enabled);
    if (!workout) return;
    const dateStr = date.toISOString().slice(0, 10);
    setRetroDate(dateStr);
    setRetroWorkout(workout);
    setRetroExercises(
      workout.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({ ...s, weight: "", reps: "" })),
      }))
    );
    setRetroPickerMode(null);
    setRetroPickerSearch("");
    setAvailableExerciseGroups(buildActiveExerciseGroups());
    setIsRetroLogging(true);
  }

  function handleRetroSetChange(exerciseIndex, setIndex, field, value) {
    setRetroExercises((prev) =>
      prev.map((ex, ei) =>
        ei !== exerciseIndex
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) => (si !== setIndex ? s : { ...s, [field]: value })),
            }
      )
    );
  }

  function handleRetroPickExercise(name) {
    if (retroPickerMode?.mode === "replace") {
      const idx = retroPickerMode.index;
      const sourceEx = retroExercises[idx];
      const newEx = createEditExercise(retroWorkout.id, name, sourceEx);
      setRetroExercises((prev) =>
        prev.map((ex, i) =>
          i === idx
            ? { ...newEx, sets: newEx.sets.map((s) => ({ ...s, weight: "", reps: "" })) }
            : ex
        )
      );
    } else {
      const newEx = createEditExercise(retroWorkout.id, name);
      setRetroExercises((prev) => [
        ...prev,
        { ...newEx, sets: newEx.sets.map((s) => ({ ...s, weight: "", reps: "" })) },
      ]);
    }
    setRetroPickerMode(null);
    setRetroPickerSearch("");
  }

  function handleRetroRemoveExercise(idx) {
    setRetroExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSaveRetroSession() {
    if (!retroWorkout || !retroDate) return;
    const createdAt = new Date(retroDate + "T12:00:00").toISOString();
    const updatedHistory = saveWorkoutSession(
      { ...retroWorkout, exercises: retroExercises },
      { createdAt, startedAt: createdAt, retroactive: true, skipCheckin: true }
    );
    setSessionHistory(updatedHistory);
    setIsRetroLogging(false);
    setRetroDate(null);
    setRetroWorkout(null);
    setRetroExercises([]);
    setRetroPickerMode(null);
    setRetroPickerSearch("");
    setFeedback(
      `Sessão retroativa de ${retroWorkout.title} registrada para ${new Date(
        retroDate + "T12:00:00"
      ).toLocaleDateString("pt-BR")}.`
    );
  }

  async function handleRestoreWorkoutPlan(planId) {
    setIsRestoringWorkout(planId);
    try {
      const { apiRequest } = await import("../../../services/api/client");
      await apiRequest(`/workouts/restore/${planId}`, { method: "POST" });
      const result = await hydrateWorkoutExecutionFromApi();
      if (!result.error) {
        const nextPlan = result.plan;
        setWorkoutState({
          plan: nextPlan,
          selectedWorkoutId: nextPlan.workouts.find((w) => w.enabled)?.id || nextPlan.workouts[0]?.id || "",
        });
      }
      // Atualiza a lista de histórico
      const { apiEndpoints } = await import("../../../services/api/endpoints");
      const historyRes = await apiRequest(apiEndpoints.workoutHistory).catch(() => ({ history: [] }));
      setWorkoutHistory(historyRes?.history || []);
      setFeedback("Protocolo de treino restaurado com sucesso.");
    } catch (err) {
      setFeedback("Erro ao restaurar protocolo: " + (err.message || ""));
    } finally {
      setIsRestoringWorkout(null);
    }
  }

  function handleRequestExerciseFeedback(workoutId, exerciseId, source) {
    const message =
      source === "video"
        ? "Feedback solicitado com base no vídeo enviado."
        : "Feedback solicitado com base nas anotações do exercício.";

    handleExerciseChange(workoutId, exerciseId, "aiFeedback", message);
    setFeedback(message);
  }

  function handleCompleteCurrentSet() {
    if (!selectedWorkout || !selectedExercise) return;

    const nextSetIndex = selectedExercise.sets.findIndex(
      (set, index) => index > activeSetIndex && set.enabled !== false
    );

    if (nextSetIndex >= 0) {
      // Ainda há séries neste exercício
      setActiveSetIndex(nextSetIndex);
      setRestRemainingSeconds(getExerciseRestSeconds(selectedExercise));
      setFeedback("Série encerrada. Descanso iniciado.");
      return;
    }

    // Última série do exercício
    if (sessionExerciseIndex + 1 < selectedWorkout.exercises.length) {
      // Há mais exercícios — pausa e aguarda ação do usuário
      setRestRemainingSeconds(0);
      setWaitingForNextExercise(true);
      setFeedback("Exercício concluído! Confirme para passar ao próximo.");
      return;
    }

    // Último exercício, última série → encerra sessão
    handleFinishWorkoutSession();
  }

  function renderPreviousSession() {
    if (!previousSession) {
      return <p className="previous-session-empty">Sem registro anterior para este treino.</p>;
    }

    return (
      <div className="previous-session">
        <strong>
          Último registro: {new Date(previousSession.createdAt).toLocaleDateString("pt-BR")}
        </strong>
        {previousSession.exercises.slice(0, 3).map((exercise) => (
          <div key={exercise.id} className="previous-session__exercise">
            <span>{exercise.name}</span>
            <small>
              {exercise.sets
                .filter((set) => set.enabled !== false && (set.weight || set.reps))
                .map((set, i) => `S${set.set ?? (i + 1)}: ${set.weight || "--"}kg × ${set.reps || "--"}`)
                .join("  |  ") || "sem registro"}
            </small>
          </div>
        ))}
      </div>
    );
  }

  if (!selectedWorkout) {
    return null;
  }

  return (
    <section className="workout-execution glass-panel">
      <header className="workout-execution__header">
        <div>
          <span>Protocolo recomposição 04</span>
          <h2>{selectedWorkout.title}</h2>
          <p>
            Foco: {selectedWorkout.focus} - {plan.split}
          </p>
        </div>

        <div className="workout-header-actions">
          <button type="button" className="workout-edit-button" onClick={handleOpenEditWorkout}>
            Editar treino
          </button>
          <button
            type="button"
            className="workout-start-button"
            data-tour="workout-start"
            disabled={!selectedWorkout.enabled}
            onClick={isSessionActive ? handleFinishWorkoutSession : handleStartWorkoutSession}
          >
            {isSessionActive
              ? "Finalizar sessão"
              : loadActiveSession(selectedWorkout?.id)
                ? "Retomar sessão"
                : "Iniciar sessão"}
          </button>
        </div>
      </header>

      {isHydrating ? <WorkoutLoadingSkeleton /> : null}

      {feedback ? <p className="workout-feedback">{feedback}</p> : null}

      <div className="workout-protocol-stats">
        <article>
          <span>Volume estimado</span>
          <strong>{estimatedVolume} séries</strong>
        </article>
        <article>
          <span>Duração</span>
          <strong>{Math.max(selectedWorkout.exercises.length, 1) * 8} min</strong>
        </article>
        <article>
          <span>RPE alvo</span>
          <strong>7 - 8.5</strong>
        </article>
        <article>
          <span>Última sessão</span>
          <strong>
            {previousSession
              ? new Date(previousSession.createdAt).toLocaleDateString("pt-BR")
              : "--"}
          </strong>
        </article>
        <article>
          <span>Aderência ciclo</span>
          <strong>{adherence}%</strong>
        </article>
      </div>

      <nav className="workout-week-tabs" aria-label="Dias de treino">
        {plan.workouts.map((workout) => (
          <button
            key={workout.id}
            type="button"
            className={`${selectedWorkout.id === workout.id ? "is-selected" : ""} ${
              workout.enabled ? "is-enabled" : "is-disabled"
            }`}
            disabled={!workout.enabled}
            onClick={() => handleSelectWorkout(workout)}
          >
            <strong>{getDayPrefix(workout.title)}</strong>
            <span>{workout.focus}</span>
          </button>
        ))}
      </nav>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="workout-content-tabs">
        <TabsList className="dashboard-tabs workout-tabs">
          <TabsTrigger value="treino" className="dashboard-tab-trigger">Treino</TabsTrigger>
          <TabsTrigger value="historico" className="dashboard-tab-trigger">Histórico</TabsTrigger>
          <TabsTrigger value="calendario" className="dashboard-tab-trigger">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="treino">
          {isSessionActive && selectedExercise ? createPortal(
            <div className="live-session-overlay" role="dialog" aria-modal="true">
              <section className="live-session-panel">
                {/* Cabeçalho: pill + resetar + fechar */}
                <div className="live-session-panel__top">
                  <span>Sessão ao vivo</span>
                  <div className="live-session-panel__top-actions">
                    <button
                      type="button"
                      className="live-session-reset-btn"
                      title="Resetar sessão"
                      onClick={handleResetSession}
                    >
                      ↺
                    </button>
                    <button type="button" onClick={() => setActiveSessionWorkoutId("")}>
                      Fechar
                    </button>
                  </div>
                </div>

                {/* Nav de exercícios: pílulas numeradas para pular/ver progresso */}
                <div className="live-session-exercise-nav">
                  {selectedWorkout.exercises.map((ex, i) => (
                    <button
                      key={ex.id}
                      type="button"
                      title={ex.name}
                      className={`live-session-ex-pill${i === sessionExerciseIndex ? " is-current" : ""}${i < sessionExerciseIndex ? " is-done" : ""}`}
                      onClick={() => handleJumpToExercise(i)}
                    >
                      {i < sessionExerciseIndex ? "✓" : i + 1}
                    </button>
                  ))}
                </div>

                <div className="live-session-panel__exercise">
                  <small>
                    Exercício atual - {sessionExerciseIndex + 1} de {selectedWorkout.exercises.length}
                  </small>
                  <h3>{selectedExercise.name}</h3>
                  <p>
                    {selectedExercise.suggestedSets} x {selectedExercise.suggestedReps} - descanso{" "}
                    {formatTimer(getExerciseRestSeconds(selectedExercise))}
                  </p>
                </div>

                <div className="live-session-timers">
                  <article>
                    <span>Cronômetro</span>
                    <strong>{formatTimer(sessionElapsedSeconds)}</strong>
                  </article>
                  <article className={restRemainingSeconds > 0 ? "is-resting" : ""}>
                    <span>Descanso</span>
                    <strong>
                      {restRemainingSeconds > 0
                        ? formatTimer(restRemainingSeconds)
                        : formatTimer(getExerciseRestSeconds(selectedExercise))}
                    </strong>
                  </article>
                </div>

                {/* Painel de transição entre exercícios */}
                {waitingForNextExercise && (
                  <div className="live-session-next-ex">
                    <p className="live-session-next-ex__done">
                      ✓ Exercício {sessionExerciseIndex + 1} concluído
                    </p>
                    <p className="live-session-next-ex__label">Próximo exercício:</p>
                    <strong className="live-session-next-ex__name">
                      {selectedWorkout.exercises[sessionExerciseIndex + 1]?.name}
                    </strong>
                    <button
                      type="button"
                      className="live-session-next-ex__btn"
                      onClick={handleStartNextExercise}
                    >
                      Iniciar próximo exercício →
                    </button>
                  </div>
                )}

                {/* Um card por série habilitada, cada um com seus próprios inputs */}
                <div className="live-session-sets-list" style={waitingForNextExercise ? { opacity: 0.35, pointerEvents: "none" } : undefined}>
                  {selectedExercise.sets
                    .map((set, originalIndex) => ({ set, originalIndex }))
                    .filter(({ set }) => set.enabled !== false)
                    .map(({ set, originalIndex }) => {
                      const isDone = !!(set.weight || set.reps);
                      const isActive = activeSetIndex === originalIndex;
                      return (
                        <div
                          key={set.set}
                          className={`live-session-set-card${isActive ? " is-active" : ""}${isDone ? " is-done" : ""}`}
                          onClick={() => setActiveSetIndex(originalIndex)}
                        >
                          <div className="live-session-set-card__header">
                            <strong>Série {set.set}</strong>
                            {isDone && <span className="live-session-set-card__check">✓</span>}
                          </div>
                          <div className="live-session-set-card__inputs">
                            <label onClick={(e) => e.stopPropagation()}>
                              <span>Carga (kg)</span>
                              <input
                                value={set.weight || ""}
                                onChange={(e) =>
                                  handleSetChange(
                                    selectedWorkout.id,
                                    selectedExercise.id,
                                    originalIndex,
                                    "weight",
                                    e.target.value
                                  )
                                }
                                onFocus={() => setActiveSetIndex(originalIndex)}
                                placeholder="kg"
                              />
                            </label>
                            <label onClick={(e) => e.stopPropagation()}>
                              <span>Reps</span>
                              <input
                                value={set.reps || ""}
                                onChange={(e) =>
                                  handleSetChange(
                                    selectedWorkout.id,
                                    selectedExercise.id,
                                    originalIndex,
                                    "reps",
                                    e.target.value
                                  )
                                }
                                onFocus={() => setActiveSetIndex(originalIndex)}
                                placeholder="10"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="live-session-footer">
                  <span>RPE alvo 8</span>
                  <button type="button" onClick={handleCompleteCurrentSet}>
                    Encerrar série
                  </button>
                </div>
              </section>
            </div>,
            document.body
          ) : null}

          {/* ── Modal de edição de treino ──────────────────────────────────── */}
          {isEditingWorkout && createPortal(
            <div className="workout-edit-overlay" role="dialog" aria-modal="true">
              <section className="workout-edit-panel">
                {/* Header */}
                <div className="workout-edit-panel__header">
                  <div>
                    <h3 className="workout-edit-panel__title">Editar treino</h3>
                    <p className="workout-edit-panel__sub">{selectedWorkout.title} — {selectedWorkout.focus}</p>
                  </div>
                  <button
                    type="button"
                    className="workout-edit-close-btn"
                    onClick={() => setIsEditingWorkout(false)}
                  >
                    ✕
                  </button>
                </div>

                {/* Body: lista + picker */}
                <div className="workout-edit-panel__body">
                  <div className="workout-edit-list">
                    {editExercises.map((ex, idx) => (
                      <div
                        key={ex.id}
                        className={`workout-edit-row${pickerMode?.mode === "replace" && pickerMode.index === idx ? " is-picking" : ""}`}
                      >
                        <span className="workout-edit-row__index">{idx + 1}</span>
                        <div className="workout-edit-row__info">
                          <strong>{ex.name}</strong>
                          <span>{ex.suggestedSets} × {ex.suggestedReps} · descanso {formatTimer(ex.restSeconds || 90)}</span>
                        </div>
                        <div className="workout-edit-row__actions">
                          <button
                            type="button"
                            className="workout-edit-reorder-btn"
                            disabled={idx === 0}
                            title="Mover para cima"
                            onClick={() => handleMoveEditExercise(idx, -1)}
                          >↑</button>
                          <button
                            type="button"
                            className="workout-edit-reorder-btn"
                            disabled={idx === editExercises.length - 1}
                            title="Mover para baixo"
                            onClick={() => handleMoveEditExercise(idx, 1)}
                          >↓</button>
                          <button
                            type="button"
                            className={`workout-edit-replace-btn${pickerMode?.mode === "replace" && pickerMode.index === idx ? " is-active" : ""}`}
                            onClick={() =>
                              setPickerMode(
                                pickerMode?.mode === "replace" && pickerMode.index === idx
                                  ? null
                                  : { mode: "replace", index: idx }
                              )
                            }
                          >
                            Substituir
                          </button>
                          <button
                            type="button"
                            className="workout-edit-remove-btn"
                            title="Remover"
                            onClick={() => handleRemoveEditExercise(idx)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Picker de exercícios ou botão de adicionar */}
                  {pickerMode ? (
                    <div className="exercise-picker">
                      <div className="exercise-picker__header">
                        <span>
                          {pickerMode.mode === "replace"
                            ? `Substituir: ${editExercises[pickerMode.index]?.name}`
                            : "Adicionar exercício"}
                        </span>
                        <button type="button" onClick={() => { setPickerMode(null); setPickerSearch(""); }}>
                          Cancelar
                        </button>
                      </div>
                      <input
                        className="exercise-picker__search"
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        placeholder="Buscar exercício..."
                        autoFocus
                      />
                      <div className="exercise-picker__list">
                        {availableExerciseGroups.length === 0 ? (
                          <p className="exercise-picker__empty">
                            Nenhum aparelho ativo nas configurações. Configure sua academia em Configurações → Aparelhos.
                          </p>
                        ) : (
                          availableExerciseGroups
                            .flatMap((g) => g.exercises.map((name) => ({ name, group: g.group })))
                            .filter(({ name }) =>
                              !pickerSearch ||
                              name.toLowerCase().includes(pickerSearch.toLowerCase())
                            )
                            .map(({ name, group }) => (
                              <button
                                key={`${group}-${name}`}
                                type="button"
                                className="exercise-picker__item"
                                onClick={() => handlePickExercise(name)}
                              >
                                <span>{name}</span>
                                <em>{group}</em>
                              </button>
                            ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="workout-edit-add-btn"
                      onClick={() => setPickerMode({ mode: "add" })}
                    >
                      + Adicionar exercício
                    </button>
                  )}
                </div>

                {/* Footer: escopo de salvamento */}
                <div className="workout-edit-panel__footer">
                  <button
                    type="button"
                    className="workout-edit-cancel-btn"
                    onClick={() => setIsEditingWorkout(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="workout-edit-save-day-btn"
                    onClick={() => handleSaveEditedWorkout("day")}
                  >
                    Salvar neste dia
                  </button>
                  <button
                    type="button"
                    className="workout-edit-save-all-btn"
                    onClick={() => handleSaveEditedWorkout("all")}
                  >
                    Salvar em todos os dias
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )}

          <article className="workout-protocol-panel" data-tour="workout-exercises">
            <header>
              <div>
                <h3>Exercícios</h3>
                <p>
                  {completedExercises}/{selectedWorkout.exercises.length} completos - marque conforme avança
                </p>
              </div>
            </header>

            <div className="exercise-list">
              <div className="workout-history-panel">{renderPreviousSession()}</div>

              {selectedWorkout.exercises.map((exercise, exerciseIndex) => {
                const isExerciseDone = exercise.sets.some(
                  (set) => set.enabled !== false && (set.weight || set.reps)
                );
                return (
                <section
                  key={exercise.id}
                  className={`exercise-card${expandedExerciseIndex === exerciseIndex ? " is-selected" : ""}${isExerciseDone ? " is-completed" : ""}`}
                >
                  <div className="exercise-card__top">
                    <span className={`exercise-card__index${isExerciseDone ? " is-completed" : ""}`}>
                      {isExerciseDone ? "✓" : exerciseIndex + 1}
                    </span>
                    <div className="exercise-card__main">
                      <h4>{exercise.name}</h4>
                      <span>
                        {getExerciseSetCount(exercise)} séries - {exercise.suggestedReps} reps
                      </span>
                      <small>Descanso ideal: {formatTimer(getExerciseRestSeconds(exercise))}</small>
                    </div>
                    <div className="exercise-card__actions">
                      {/* Reordenar exercício */}
                      <div className="exercise-reorder-btns">
                        <button
                          type="button"
                          className="exercise-reorder-btn"
                          title="Mover para cima"
                          disabled={exerciseIndex === 0}
                          onClick={() => handleMoveExercise(selectedWorkout.id, exercise.id, -1)}
                        >↑</button>
                        <button
                          type="button"
                          className="exercise-reorder-btn"
                          title="Mover para baixo"
                          disabled={exerciseIndex === selectedWorkout.exercises.length - 1}
                          onClick={() => handleMoveExercise(selectedWorkout.id, exercise.id, 1)}
                        >↓</button>
                      </div>
                      <button
                        type="button"
                        className="exercise-select-button"
                        data-tour={exerciseIndex === 0 ? "exercise-detail-btn" : undefined}
                        onClick={() => {
                          setExpandedExerciseIndex((current) =>
                            current === exerciseIndex ? null : exerciseIndex
                          );
                        }}
                      >
                        {expandedExerciseIndex === exerciseIndex ? "Recolher" : "Ver detalhes"}
                      </button>
                      {isPro && (
                        <label className="exercise-video-upload">
                          Enviar vídeo
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(event) =>
                              handleVideoUpload(
                                selectedWorkout.id,
                                exercise.id,
                                event.target.files?.[0]
                              )
                            }
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {expandedExerciseIndex === exerciseIndex ? (
                    <>
                      {/* ── Seção de detalhes do exercício ─────────────────── */}
                      <div className="exercise-detail">
                        <div className="exercise-detail__header">
                          {/* Coluna esquerda: placeholder de vídeo */}
                          <div className="exercise-video-preview">
                            <button
                              type="button"
                              onClick={() => setActiveVideo(exercise)}
                              disabled={!exercise.executionVideoUrl}
                            >
                              <span>{exercise.executionVideoUrl ? "Ver vídeo" : "Sem vídeo"}</span>
                            </button>
                            <small>Vídeo demonstrativo</small>
                          </div>

                          {/* Coluna direita: prescrição + URL + feedback */}
                          <div className="exercise-detail__meta">
                            <div className="exercise-prescription">
                              <span>Prescrição do Personal Virtual</span>
                              <div className="exercise-prescription__badges">
                                <strong>{exercise.suggestedSets} séries</strong>
                                <strong>{exercise.suggestedReps} reps</strong>
                                <strong>Descanso {formatTimer(getExerciseRestSeconds(exercise))}</strong>
                              </div>
                              <small>Somente o Personal Virtual altera séries e repetições prescritas.</small>
                            </div>

                            <label>
                              Feedback do Personal Virtual
                              <textarea
                                value={exercise.aiFeedback}
                                onChange={(event) =>
                                  handleExerciseChange(
                                    selectedWorkout.id,
                                    exercise.id,
                                    "aiFeedback",
                                    event.target.value
                                  )
                                }
                                placeholder="Feedback técnico gerado pelo Personal Virtual após analisar o vídeo ou as anotações"
                              />
                              {isPro && (
                                <button
                                  type="button"
                                  className="feedback-request-button"
                                  onClick={() =>
                                    handleRequestExerciseFeedback(selectedWorkout.id, exercise.id, "video")
                                  }
                                >
                                  Solicitar feedback do vídeo
                                </button>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>

                      <label className="exercise-notes">
                        Anotações
                        <textarea
                          value={exercise.notes}
                          onChange={(event) =>
                            handleExerciseChange(
                              selectedWorkout.id,
                              exercise.id,
                              "notes",
                              event.target.value
                            )
                          }
                          placeholder="Carga sentida, dor, RPE, ajuste de técnica..."
                        />
                        <button
                          type="button"
                          className="feedback-request-button"
                          onClick={() =>
                            handleRequestExerciseFeedback(selectedWorkout.id, exercise.id, "notes")
                          }
                        >
                          Solicitar feedback das anotações
                        </button>
                      </label>
                    </>
                  ) : null}
                </section>
                );
              })}
            </div>
          </article>
        </TabsContent>

        <TabsContent value="historico">
          <div className="workout-history-overview">
            <article>
              <span>Última execução</span>
              <strong>{previousSession ? formatWorkoutDate(previousSession.createdAt) : "--"}</strong>
            </article>
            <article>
              <span>Séries registradas</span>
              <strong>{previousSession ? getRegisteredSets(previousSession) : 0}</strong>
            </article>
            <article>
              <span>Volume último treino</span>
              <strong>{previousSession ? Math.round(getSessionVolume(previousSession)) : 0}</strong>
            </article>
          </div>

          {selectedWorkoutSessions.length ? (
            <WorkoutSessionHistoryTable sessions={recentSessions} />
          ) : (
            <WorkoutEmptyState
              title="Sem histórico para este treino"
              description="Finalize pelo menos uma sessão para ver duração, séries e volume aqui."
            />
          )}

          {/* Protocolos anteriores */}
          {workoutHistory.length > 0 && (
            <div className="workout-protocol-history glass-panel">
              <div className="workout-protocol-history__header">
                <strong>Protocolos anteriores</strong>
                <p>Restaure um protocolo arquivado para usá-lo novamente como plano ativo.</p>
              </div>
              <div className="workout-protocol-history__list">
                {workoutHistory.map((item) => (
                  <div key={item.id} className="workout-protocol-history__item">
                    <div>
                      <strong>{item.title || "Protocolo arquivado"}</strong>
                      <span>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                          : "--"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={isRestoringWorkout === item.id}
                      onClick={() => handleRestoreWorkoutPlan(item.id)}
                    >
                      {isRestoringWorkout === item.id ? "Restaurando..." : "Restaurar"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendario">
          <div className="workout-calendar glass-panel">
            {/* Navegação de mês */}
            <div className="workout-calendar__nav">
              <button
                type="button"
                className="workout-calendar__nav-btn"
                onClick={() =>
                  setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
              >
                ←
              </button>
              <strong className="workout-calendar__nav-title">
                {calendarDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </strong>
              <button
                type="button"
                className="workout-calendar__nav-btn"
                onClick={() =>
                  setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
              >
                →
              </button>
            </div>

            {/* Grade do calendário */}
            <div className="workout-calendar__grid">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((d) => (
                <div key={d} className="calendar-weekday">{d}</div>
              ))}

              {buildCalendarCells(calendarDate.getFullYear(), calendarDate.getMonth()).map(
                (cell, i) => {
                  const today = new Date();
                  const isToday =
                    !cell.outside &&
                    cell.date.getDate() === today.getDate() &&
                    cell.date.getMonth() === today.getMonth() &&
                    cell.date.getFullYear() === today.getFullYear();
                  const status = cell.outside
                    ? null
                    : getDayStatus(cell.date, plan, sessionHistory);
                  const dayId = getWeekdayId(cell.date);
                  const workout = !cell.outside
                    ? plan.workouts.find((w) => w.id === dayId)
                    : null;
                  const isClickable =
                    !cell.outside &&
                    status !== null &&
                    status !== "rest" &&
                    status !== "planned";

                  return (
                    <div
                      key={i}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      className={[
                        "calendar-day",
                        cell.outside ? "calendar-day--outside" : "",
                        isToday ? "is-today" : "",
                        status ? `is-${status}` : "",
                        isClickable ? "is-clickable" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => isClickable && handleCalendarDayClick(cell.date)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && isClickable && handleCalendarDayClick(cell.date)
                      }
                      title={
                        !cell.outside && workout?.enabled
                          ? `${workout.title} — ${workout.focus}`
                          : undefined
                      }
                    >
                      <span className="calendar-day__num">{cell.date.getDate()}</span>
                      {!cell.outside && status === "done" && (
                        <span className="calendar-day__dot calendar-day__dot--done" />
                      )}
                      {!cell.outside && workout?.enabled && (
                        <span className="calendar-day__focus">
                          {workout.shortTitle.slice(0, 3)}
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            {/* Legenda */}
            <div className="workout-calendar__legend">
              <span className="legend-item is-done">✓ Realizado</span>
              <span className="legend-item is-missed">✗ Perdido</span>
              <span className="legend-item is-planned">○ Previsto</span>
              <span className="legend-item is-rest">· Descanso</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modal de registro retroativo — fora das Tabs para funcionar de qualquer aba ── */}
      {isRetroLogging && retroWorkout && createPortal(
        <div className="workout-edit-overlay" role="dialog" aria-modal="true">
          <section className="workout-edit-panel">
            <div className="workout-edit-panel__header">
              <div>
                <h3 className="workout-edit-panel__title">Registrar sessão retroativa</h3>
                <p className="workout-edit-panel__sub">
                  {retroWorkout.title} —{" "}
                  {new Date(retroDate + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                type="button"
                className="workout-edit-close-btn"
                onClick={() => { setIsRetroLogging(false); setRetroPickerMode(null); setRetroPickerSearch(""); }}
              >
                ✕
              </button>
            </div>

            <div className="workout-edit-panel__body">
              <p className="retro-session-hint">
                Registre os pesos e repetições. Use Substituir para trocar exercícios ou
                adicione extras abaixo da lista.
              </p>

              {/* Lista de exercícios */}
              <div className="retro-session-list">
                {retroExercises.map((ex, ei) => (
                  <div
                    key={ex.id}
                    className={`retro-session-exercise${retroPickerMode?.mode === "replace" && retroPickerMode.index === ei ? " is-picking" : ""}`}
                  >
                    {/* Cabeçalho: nome + ações */}
                    <div className="retro-session-exercise__header">
                      <strong className="retro-session-exercise__name">{ei + 1}. {ex.name}</strong>
                      <div className="retro-session-exercise__actions">
                        <span className="retro-session-exercise__prescription">{ex.suggestedSets} × {ex.suggestedReps}</span>
                        <button
                          type="button"
                          className={`workout-edit-replace-btn${retroPickerMode?.mode === "replace" && retroPickerMode.index === ei ? " is-active" : ""}`}
                          onClick={() =>
                            setRetroPickerMode(
                              retroPickerMode?.mode === "replace" && retroPickerMode.index === ei
                                ? null
                                : { mode: "replace", index: ei }
                            )
                          }
                        >
                          Substituir
                        </button>
                        <button
                          type="button"
                          className="workout-edit-remove-btn"
                          title="Remover"
                          onClick={() => handleRetroRemoveExercise(ei)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Séries: peso × reps */}
                    <div className="retro-session-sets">
                      {ex.sets.map((set, si) => {
                        if (set.enabled === false) return null;
                        return (
                          <div key={si} className="retro-session-set">
                            <span className="retro-session-set__label">S{set.set ?? si + 1}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={set.weight}
                              onChange={(e) => handleRetroSetChange(ei, si, "weight", e.target.value)}
                              placeholder="kg"
                            />
                            <span className="retro-session-set__sep">×</span>
                            <input
                              type="number"
                              min="0"
                              value={set.reps}
                              onChange={(e) => handleRetroSetChange(ei, si, "reps", e.target.value)}
                              placeholder="reps"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Picker de exercícios ou botão de adicionar */}
              {retroPickerMode ? (
                <div className="exercise-picker">
                  <div className="exercise-picker__header">
                    <span>
                      {retroPickerMode.mode === "replace"
                        ? `Substituir: ${retroExercises[retroPickerMode.index]?.name}`
                        : "Adicionar exercício"}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setRetroPickerMode(null); setRetroPickerSearch(""); }}
                    >
                      Cancelar
                    </button>
                  </div>
                  <input
                    className="exercise-picker__search"
                    value={retroPickerSearch}
                    onChange={(e) => setRetroPickerSearch(e.target.value)}
                    placeholder="Buscar exercício..."
                    autoFocus
                  />
                  <div className="exercise-picker__list">
                    {availableExerciseGroups.length === 0 ? (
                      <p className="exercise-picker__empty">
                        Nenhum aparelho ativo nas configurações. Configure sua academia em
                        Configurações → Aparelhos.
                      </p>
                    ) : (
                      availableExerciseGroups
                        .flatMap((g) => g.exercises.map((name) => ({ name, group: g.group })))
                        .filter(
                          ({ name }) =>
                            !retroPickerSearch ||
                            name.toLowerCase().includes(retroPickerSearch.toLowerCase())
                        )
                        .map(({ name, group }) => (
                          <button
                            key={`${group}-${name}`}
                            type="button"
                            className="exercise-picker__item"
                            onClick={() => handleRetroPickExercise(name)}
                          >
                            <span>{name}</span>
                            <em>{group}</em>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="workout-edit-add-btn"
                  onClick={() => setRetroPickerMode({ mode: "add" })}
                >
                  + Adicionar exercício
                </button>
              )}
            </div>

            <div className="workout-edit-panel__footer">
              <button
                type="button"
                className="workout-edit-cancel-btn"
                onClick={() => { setIsRetroLogging(false); setRetroPickerMode(null); setRetroPickerSearch(""); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="workout-edit-save-all-btn"
                onClick={handleSaveRetroSession}
              >
                Salvar sessão
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}

      {activeVideo ? (
        <div className="video-modal" role="dialog" aria-modal="true">
          <div className="video-modal__content">
            <button type="button" onClick={() => setActiveVideo(null)}>
              Fechar
            </button>
            <h3>{activeVideo.name}</h3>
            {activeVideo.executionVideoUrl ? (
              <iframe
                src={activeVideo.executionVideoUrl}
                title={`Vídeo de execução ${activeVideo.name}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>Adicione uma URL de vídeo demonstrativo para visualizar.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WorkoutHistorySection() {
  const [plan, setPlan] = useState(() => loadWorkoutExecution());
  const [sessionHistory, setSessionHistory] = useState(() => loadWorkoutSessionHistory());
  const [isHydrating, setIsHydrating] = useState(true);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState("all");

  useEffect(() => {
    let ignore = false;

    async function hydrateHistory() {
      setIsHydrating(true);
      const [planResult, sessionResult] = await Promise.all([
        hydrateWorkoutExecutionFromApi(),
        hydrateWorkoutSessionsFromApi(),
      ]);

      if (ignore) return;

      if (!planResult.error) {
        setPlan(planResult.plan);
      }

      if (!sessionResult.error) {
        setSessionHistory(sessionResult.sessions);
      }

      setIsHydrating(false);
    }

    hydrateHistory();

    return () => {
      ignore = true;
    };
  }, []);

  const enabledWorkouts = plan.workouts.filter((workout) => workout.enabled);
  const filteredSessions =
    selectedWorkoutId === "all"
      ? sessionHistory
      : sessionHistory.filter((session) => session.workoutId === selectedWorkoutId);
  const totalVolume = filteredSessions.reduce((sum, session) => sum + getSessionVolume(session), 0);
  const totalRegisteredSets = filteredSessions.reduce(
    (sum, session) => sum + getRegisteredSets(session),
    0
  );

  return (
    <section className="workout-execution glass-panel">
      <header className="workout-execution__header">
        <div>
          <span>Histórico salvo</span>
          <h2>Comparativo de execuções</h2>
          <p>Consulte sessões salvas por treino, volume estimado e quantidade de séries registradas.</p>
        </div>
      </header>

      {isHydrating ? <WorkoutLoadingSkeleton /> : null}

      <div className="workout-protocol-stats">
        <article>
          <span>Sessões</span>
          <strong>{filteredSessions.length}</strong>
        </article>
        <article>
          <span>Séries registradas</span>
          <strong>{totalRegisteredSets}</strong>
        </article>
        <article>
          <span>Volume total</span>
          <strong>{Math.round(totalVolume)}</strong>
        </article>
        <article>
          <span>Treinos ativos</span>
          <strong>{enabledWorkouts.length}</strong>
        </article>
        <article>
          <span>Último registro</span>
          <strong>{filteredSessions[0] ? formatWorkoutDate(filteredSessions[0].createdAt) : "--"}</strong>
        </article>
      </div>

      <nav className="workout-week-tabs" aria-label="Filtro do histórico de treinos">
        <button
          type="button"
          className={selectedWorkoutId === "all" ? "is-selected is-enabled" : "is-enabled"}
          onClick={() => setSelectedWorkoutId("all")}
        >
          <strong>Todos</strong>
          <span>{sessionHistory.length} registros</span>
        </button>
        {plan.workouts.map((workout) => {
          const sessionCount = sessionHistory.filter((session) => session.workoutId === workout.id).length;

          return (
            <button
              key={workout.id}
              type="button"
              className={`${selectedWorkoutId === workout.id ? "is-selected" : ""} ${
                workout.enabled ? "is-enabled" : "is-disabled"
              }`}
              disabled={!workout.enabled && sessionCount === 0}
              onClick={() => setSelectedWorkoutId(workout.id)}
            >
              <strong>{getDayPrefix(workout.title)}</strong>
              <span>{sessionCount} registro(s)</span>
            </button>
          );
        })}
      </nav>

      {filteredSessions.length ? (
        <WorkoutSessionHistoryTable sessions={filteredSessions.slice(0, 12)} />
      ) : (
        <WorkoutEmptyState
          title="Nada salvo neste filtro ainda"
          description="Finalize uma sessão em Treinos para começar a construir o histórico comparativo."
        />
      )}
    </section>
  );
}

export default function WorkoutsPage() {
  const { pathname } = useLocation();
  const { workoutId } = useParams();

  const viewKey = getWorkoutView(pathname, workoutId);
  const content = { ...workoutsViews[viewKey] };

  if (workoutId) {
    content.title = `Treino de ${workoutId}`;
    content.footerNote = `Rota dinâmica funcionando em /treinos/${workoutId}. Depois ela deve buscar o dia de treino real pelo id no backend.`;
  }

  return (
    <div className="workouts-page">
      <header className="workouts-clean-hero glass-panel">
        <span>{content.badge}</span>
        <h1>{content.title}</h1>
        <p>Plano de treino, execução, vídeos e histórico de cargas do protocolo atual.</p>
      </header>
      {["list", "generate", "detail"].includes(viewKey) ? <WorkoutExecutionSection /> : null}
      {viewKey === "history" ? <WorkoutHistorySection /> : null}
    </div>
  );
}
