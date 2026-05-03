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
} from "../../../data/workoutExecutionStorage";
import "./WorkoutsPage.css";

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
            <TableHead>Duracao</TableHead>
            <TableHead>Series</TableHead>
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
                <strong>{formatExerciseSummary(session) || "Sem exercicios registrados"}</strong>
                <span>
                  {session.exercises.length} exercicio(s) no registro
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
  const [workoutState, setWorkoutState] = useState(() => getInitialWorkoutState());
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
    setActiveSessionWorkoutId(selectedWorkout.id);
    setSessionStartedAt(new Date().toISOString());
    setSessionExerciseIndex(0);
    setActiveSetIndex(0);
    setSessionElapsedSeconds(0);
    setRestRemainingSeconds(0);
    setFeedback(`Sessao de ${selectedWorkout.title} iniciada.`);
  }

  function handleFinishWorkoutSession() {
    if (!selectedWorkout) return;
    const updatedHistory = saveWorkoutSession(selectedWorkout, { startedAt: sessionStartedAt });
    setSessionHistory(updatedHistory);
    setActiveSessionWorkoutId("");
    setSessionStartedAt("");
    setSessionElapsedSeconds(0);
    setRestRemainingSeconds(0);
    setFeedback(
      `${selectedWorkout.title} finalizado. A sessao foi salva, alimentou o dashboard e criou o registro diario automatico.`
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
        ? "Feedback solicitado com base no video enviado."
        : "Feedback solicitado com base nas anotacoes do exercicio.";

    handleExerciseChange(workoutId, exerciseId, "aiFeedback", message);
    setFeedback(message);
  }

  function handleCompleteCurrentSet() {
    if (!selectedWorkout || !selectedExercise) return;

    const nextSetIndex = selectedExercise.sets.findIndex(
      (set, index) => index > activeSetIndex && set.enabled !== false
    );
    const shouldStartRest =
      nextSetIndex >= 0 || sessionExerciseIndex + 1 < selectedWorkout.exercises.length;

    if (nextSetIndex >= 0) {
      setActiveSetIndex(nextSetIndex);
      setRestRemainingSeconds(getExerciseRestSeconds(selectedExercise));
      setFeedback("Serie encerrada. Descanso iniciado.");
      return;
    }

    if (sessionExerciseIndex + 1 < selectedWorkout.exercises.length) {
      setSessionExerciseIndex(sessionExerciseIndex + 1);
      setActiveSetIndex(0);
      setRestRemainingSeconds(shouldStartRest ? getExerciseRestSeconds(selectedExercise) : 0);
      setFeedback("Exercicio concluido. Descanso iniciado antes do proximo exercicio.");
      return;
    }

    handleFinishWorkoutSession();
  }

  function renderPreviousSession() {
    if (!previousSession) {
      return <p className="previous-session-empty">Sem registro anterior para este treino.</p>;
    }

    return (
      <div className="previous-session">
        <strong>
          Ultimo registro: {new Date(previousSession.createdAt).toLocaleDateString("pt-BR")}
        </strong>
        {previousSession.exercises.slice(0, 3).map((exercise) => (
          <div key={exercise.id} className="previous-session__exercise">
            <span>{exercise.name}</span>
            <small>
              {exercise.sets
                .filter((set) => set.enabled !== false)
                .map((set) => `S${set.set}: ${set.weight || "--"}kg x ${set.reps || "--"}`)
                .join(" | ")}
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
          <span>Protocolo recomposicao 04</span>
          <h2>{selectedWorkout.title}</h2>
          <p>
            Foco: {selectedWorkout.focus} - {plan.split}
          </p>
        </div>

        <div className="workout-header-actions">
          <button type="button" className="workout-edit-button">
            Editar treino
          </button>
          <button
            type="button"
            className="workout-start-button"
            data-tour="workout-start"
            disabled={!selectedWorkout.enabled}
            onClick={isSessionActive ? handleFinishWorkoutSession : handleStartWorkoutSession}
          >
            {isSessionActive ? "Finalizar sessao" : "Iniciar sessao"}
          </button>
        </div>
      </header>

      {isHydrating ? <WorkoutLoadingSkeleton /> : null}

      {feedback ? <p className="workout-feedback">{feedback}</p> : null}

      <div className="workout-protocol-stats">
        <article>
          <span>Volume estimado</span>
          <strong>{estimatedVolume} series</strong>
        </article>
        <article>
          <span>Duracao</span>
          <strong>{Math.max(selectedWorkout.exercises.length, 1) * 8} min</strong>
        </article>
        <article>
          <span>RPE alvo</span>
          <strong>7 - 8.5</strong>
        </article>
        <article>
          <span>Ultima sessao</span>
          <strong>
            {previousSession
              ? new Date(previousSession.createdAt).toLocaleDateString("pt-BR")
              : "--"}
          </strong>
        </article>
        <article>
          <span>Aderencia ciclo</span>
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
          <TabsTrigger value="historico" className="dashboard-tab-trigger">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="treino">
          {isSessionActive && selectedExercise ? createPortal(
            <div className="live-session-overlay" role="dialog" aria-modal="true">
              <section className="live-session-panel">
                <div className="live-session-panel__top">
                  <span>Sessao ao vivo</span>
                  <button type="button" onClick={() => setActiveSessionWorkoutId("")}>
                    Fechar
                  </button>
                </div>

                <div className="live-session-panel__exercise">
                  <small>
                    Exercicio atual - {sessionExerciseIndex + 1} de {selectedWorkout.exercises.length}
                  </small>
                  <h3>{selectedExercise.name}</h3>
                  <p>
                    {selectedExercise.suggestedSets} x {selectedExercise.suggestedReps} - descanso{" "}
                    {formatTimer(getExerciseRestSeconds(selectedExercise))}
                  </p>
                </div>

                <div className="live-session-timers">
                  <article>
                    <span>Cronometro</span>
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

                <div className="live-session-sets">
                  {selectedExercise.sets
                    .filter((set) => set.enabled !== false)
                    .map((set, index) => (
                      <button
                        key={set.set}
                        type="button"
                        className={activeSetIndex === index ? "is-selected" : ""}
                        onClick={() => setActiveSetIndex(index)}
                      >
                        <strong>Serie {set.set}</strong>
                        <span>{set.weight || "--"} kg</span>
                      </button>
                    ))}
                </div>

                <div className="live-session-inputs">
                  <label>
                    Carga (kg)
                    <input
                      value={selectedSet?.weight || ""}
                      onChange={(event) =>
                        handleSetChange(
                          selectedWorkout.id,
                          selectedExercise.id,
                          activeSetIndex,
                          "weight",
                          event.target.value
                        )
                      }
                      placeholder="Ex.: 72"
                    />
                  </label>
                  <label>
                    Repeticoes
                    <input
                      value={selectedSet?.reps || ""}
                      onChange={(event) =>
                        handleSetChange(
                          selectedWorkout.id,
                          selectedExercise.id,
                          activeSetIndex,
                          "reps",
                          event.target.value
                        )
                      }
                      placeholder="Ex.: 10"
                    />
                  </label>
                </div>

                <div className="live-session-footer">
                  <span>RPE alvo 8</span>
                  <button type="button" onClick={handleCompleteCurrentSet}>
                    Encerrar serie
                  </button>
                </div>
              </section>
            </div>,
            document.body
          ) : null}

          <article className="workout-protocol-panel" data-tour="workout-exercises">
            <header>
              <div>
                <h3>Exercicios</h3>
                <p>
                  {completedExercises}/{selectedWorkout.exercises.length} completos - marque conforme avanca
                </p>
              </div>
              <button type="button">Adicionar exercicio</button>
            </header>

            <div className="exercise-list">
              <div className="workout-history-panel">{renderPreviousSession()}</div>

              {selectedWorkout.exercises.map((exercise, exerciseIndex) => (
                <section
                  key={exercise.id}
                  className={`exercise-card ${
                    expandedExerciseIndex === exerciseIndex ? "is-selected" : ""
                  }`}
                >
                  <div className="exercise-card__top">
                    <span className="exercise-card__index">{exerciseIndex + 1}</span>
                    <div className="exercise-card__main">
                      <h4>{exercise.name}</h4>
                      <span>
                        {getExerciseSetCount(exercise)} series - {exercise.suggestedReps} reps
                      </span>
                      <small>Descanso ideal: {formatTimer(getExerciseRestSeconds(exercise))}</small>
                    </div>
                    <div className="exercise-card__actions">
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
                      <label className="exercise-video-upload">
                        Enviar video
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
                    </div>
                  </div>

                  {expandedExerciseIndex === exerciseIndex ? (
                    <>
                      <div className="exercise-fields">
                        <div className="exercise-video-preview">
                          <button
                            type="button"
                            onClick={() => setActiveVideo(exercise)}
                            disabled={!exercise.executionVideoUrl}
                          >
                            <span>{exercise.executionVideoUrl ? "Ver video" : "Sem video"}</span>
                          </button>
                          <small>Miniatura do video demonstrativo</small>
                        </div>

                        <div className="exercise-prescription">
                          <span>Prescricao do Personal Virtual</span>
                          <strong>{exercise.suggestedSets} series</strong>
                          <strong>{exercise.suggestedReps} reps</strong>
                          <strong>Descanso {formatTimer(getExerciseRestSeconds(exercise))}</strong>
                          <small>Somente o Personal Virtual altera series e repeticoes prescritas.</small>
                        </div>

                        <label>
                          Video demonstrativo
                          <input
                            value={exercise.executionVideoUrl}
                            onChange={(event) =>
                              handleExerciseChange(
                                selectedWorkout.id,
                                exercise.id,
                                "executionVideoUrl",
                                event.target.value
                              )
                            }
                            placeholder="URL do video de execucao"
                          />
                        </label>
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
                            placeholder="Feedback tecnico gerado pelo Personal Virtual apos analisar o video ou as anotacoes"
                          />
                          <button
                            type="button"
                            className="feedback-request-button"
                            onClick={() =>
                              handleRequestExerciseFeedback(selectedWorkout.id, exercise.id, "video")
                            }
                          >
                            Solicitar feedback do video
                          </button>
                        </label>
                      </div>

                      <p className="set-log-locked">
                        {isSessionActive
                          ? "Use o painel de sessao acima para registrar a serie atual."
                          : "Clique em Iniciar sessao para registrar series, cargas e repeticoes."}
                      </p>

                      <label className="exercise-notes">
                        Anotacoes
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
                          placeholder="Carga sentida, dor, RPE, ajuste de tecnica..."
                        />
                        <button
                          type="button"
                          className="feedback-request-button"
                          onClick={() =>
                            handleRequestExerciseFeedback(selectedWorkout.id, exercise.id, "notes")
                          }
                        >
                          Solicitar feedback das anotacoes
                        </button>
                      </label>
                    </>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        </TabsContent>

        <TabsContent value="historico">
          <div className="workout-history-overview">
            <article>
              <span>Ultima execucao</span>
              <strong>{previousSession ? formatWorkoutDate(previousSession.createdAt) : "--"}</strong>
            </article>
            <article>
              <span>Series registradas</span>
              <strong>{previousSession ? getRegisteredSets(previousSession) : 0}</strong>
            </article>
            <article>
              <span>Volume ultimo treino</span>
              <strong>{previousSession ? Math.round(getSessionVolume(previousSession)) : 0}</strong>
            </article>
          </div>

          {selectedWorkoutSessions.length ? (
            <WorkoutSessionHistoryTable sessions={recentSessions} />
          ) : (
            <WorkoutEmptyState
              title="Sem historico para este treino"
              description="Finalize pelo menos uma sessao para ver duracao, series e volume aqui."
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
      </Tabs>

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
                title={`Video de execucao ${activeVideo.name}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>Adicione uma URL de video demonstrativo para visualizar.</p>
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
          <span>Historico salvo</span>
          <h2>Comparativo de execucoes</h2>
          <p>Consulte sessoes salvas por treino, volume estimado e quantidade de series registradas.</p>
        </div>
      </header>

      {isHydrating ? <WorkoutLoadingSkeleton /> : null}

      <div className="workout-protocol-stats">
        <article>
          <span>Sessoes</span>
          <strong>{filteredSessions.length}</strong>
        </article>
        <article>
          <span>Series registradas</span>
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
          <span>Ultimo registro</span>
          <strong>{filteredSessions[0] ? formatWorkoutDate(filteredSessions[0].createdAt) : "--"}</strong>
        </article>
      </div>

      <nav className="workout-week-tabs" aria-label="Filtro do historico de treinos">
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
          description="Finalize uma sessao em Treinos para começar a construir o historico comparativo."
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
    content.footerNote = `Rota dinamica funcionando em /treinos/${workoutId}. Depois ela deve buscar o dia de treino real pelo id no backend.`;
  }

  return (
    <div className="workouts-page">
      <header className="workouts-clean-hero glass-panel">
        <span>{content.badge}</span>
        <h1>{content.title}</h1>
        <p>Plano de treino, execucao, videos e historico de cargas do protocolo atual.</p>
      </header>
      {["list", "generate", "detail"].includes(viewKey) ? <WorkoutExecutionSection /> : null}
      {viewKey === "history" ? <WorkoutHistorySection /> : null}
    </div>
  );
}
