import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { workoutsViews } from "../../../data/appData";
import {
  getPreviousWorkoutSession,
  hydrateWorkoutExecutionFromApi,
  hydrateWorkoutSessionsFromApi,
  loadWorkoutExecution,
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

function WorkoutExecutionSection() {
  const [workoutState, setWorkoutState] = useState(() => getInitialWorkoutState());
  const [activeSessionWorkoutId, setActiveSessionWorkoutId] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState("");
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState(null);
  const [sessionExerciseIndex, setSessionExerciseIndex] = useState(0);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(0);
  const [activeVideo, setActiveVideo] = useState(null);
  const [feedback, setFeedback] = useState("");
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
  const completedExercises = selectedWorkout ? countCompletedExercises(selectedWorkout) : 0;
  const estimatedVolume = selectedWorkout ? getEstimatedVolume(selectedWorkout) : 0;
  const adherence = Math.round(
    (completedExercises / Math.max(selectedWorkout?.exercises.length || 1, 1)) * 100
  );

  useEffect(() => {
    let ignore = false;

    async function hydrateWorkouts() {
      const result = await hydrateWorkoutExecutionFromApi();
      await hydrateWorkoutSessionsFromApi();

      if (ignore || result.error) {
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
    saveWorkoutSession(selectedWorkout, { startedAt: sessionStartedAt });
    setActiveSessionWorkoutId("");
    setSessionStartedAt("");
    setSessionElapsedSeconds(0);
    setRestRemainingSeconds(0);
    setFeedback(
      `${selectedWorkout.title} finalizado. A sessao foi salva, alimentou o dashboard e criou o registro diario automatico.`
    );
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
            disabled={!selectedWorkout.enabled}
            onClick={isSessionActive ? handleFinishWorkoutSession : handleStartWorkoutSession}
          >
            {isSessionActive ? "Finalizar sessao" : "Iniciar sessao"}
          </button>
        </div>
      </header>

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

      {isSessionActive && selectedExercise ? (
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
        </div>
      ) : null}

      <article className="workout-protocol-panel">
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
      {["list", "generate"].includes(viewKey) ? <WorkoutExecutionSection /> : null}
    </div>
  );
}
