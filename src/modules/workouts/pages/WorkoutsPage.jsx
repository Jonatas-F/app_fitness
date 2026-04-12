import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { workoutsViews } from "../../../data/appData";
import {
  getPreviousWorkoutSession,
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

function WorkoutExecutionSection() {
  const [plan, setPlan] = useState(() => loadWorkoutExecution());
  const [openWorkouts, setOpenWorkouts] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [feedback, setFeedback] = useState("");

  function updatePlan(nextPlan) {
    setPlan(saveWorkoutExecution(nextPlan));
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

  function toggleWorkout(workoutId) {
    const targetWorkout = plan.workouts.find((workout) => workout.id === workoutId);

    if (targetWorkout && !targetWorkout.enabled) {
      return;
    }

    setOpenWorkouts((current) =>
      current.includes(workoutId)
        ? current.filter((id) => id !== workoutId)
        : [...current, workoutId]
    );
  }

  function handleVideoUpload(workoutId, exerciseId, file) {
    if (!file) return;
    handleExerciseChange(workoutId, exerciseId, "userVideoFileName", file.name);
  }

  function handleSaveWorkoutSession(workout) {
    saveWorkoutSession(workout);
    setFeedback(`${workout.title} salvo no historico de execucao.`);
  }

  function handleRequestExerciseFeedback(workoutId, exerciseId, source) {
    const message =
      source === "video"
        ? "Feedback solicitado com base no video enviado."
        : "Feedback solicitado com base nas anotacoes do exercicio.";

    handleExerciseChange(workoutId, exerciseId, "aiFeedback", message);
    setFeedback(message);
  }

  function renderPreviousSession(workout) {
    const previous = getPreviousWorkoutSession(workout.id);

    if (!previous) {
      return (
        <p className="previous-session-empty">
          Sem registro anterior para este treino neste protocolo.
        </p>
      );
    }

    return (
      <div className="previous-session">
        <strong>
          Ultimo registro: {new Date(previous.createdAt).toLocaleDateString("pt-BR")}
        </strong>
        {previous.exercises.map((exercise) => (
          <div key={exercise.id} className="previous-session__exercise">
            <span>{exercise.name}</span>
            <small>
              {exercise.sets
                .map((set) => `S${set.set}: ${set.weight || "--"}kg x ${set.reps || "--"}`)
                .join(" | ")}
            </small>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="workout-execution glass-panel">
      <header className="workout-execution__header">
        <div>
          <span>Plano e execucao</span>
          <h2>Divisao do treino, videos, feedback e cargas</h2>
          <p>
            A divisao ABC/ABCD deve considerar dias por semana e turno informados
            no check-in. Os registros abaixo alimentam evolucao de carga e
            feedback tecnico.
          </p>
        </div>

        <aside>
          <strong>{plan.split}</strong>
          <small>
            {plan.weeklyTrainingDays} dia(s) | {plan.trainingShift || "turno nao informado"}
          </small>
        </aside>
      </header>

      {feedback ? <p className="workout-feedback">{feedback}</p> : null}

      <div className="workout-source-note">
        <strong>Disponibilidade vem do check-in mensal</strong>
        <p>
          Dias por semana, turno e tempo de treino devem ser atualizados no
          check-in mensal. Aqui ficam a prescricao e a execucao dos treinos.
        </p>
      </div>

      <div className="workout-days">
        {plan.workouts.map((workout) => (
          <article
            key={workout.id}
            className={`workout-day-card ${
              openWorkouts.includes(workout.id) ? "is-open" : ""
            } ${workout.enabled ? "is-enabled" : "is-disabled"}`}
          >
            <div className="workout-day-card__header">
              <button
                type="button"
                className="workout-day-card__toggle"
                onClick={() => toggleWorkout(workout.id)}
                aria-expanded={openWorkouts.includes(workout.id)}
                disabled={!workout.enabled}
              >
                <span>{openWorkouts.includes(workout.id) ? "−" : "+"}</span>
                <div>
                  <h3>{workout.title}</h3>
                  <p>{workout.focus}</p>
                </div>
              </button>
              <div className="workout-day-card__meta">
                <strong>{workout.exercises.length} exercicios</strong>
                <em>{workout.enabled ? "Habilitado" : "Desabilitado"}</em>
              </div>
            </div>

            {openWorkouts.includes(workout.id) ? <div className="exercise-list">
              <div className="workout-history-panel">
                <div>
                  <h4>Historico do {workout.title}</h4>
                  <p>Consulte o desempenho anterior antes de registrar a proxima execucao.</p>
                </div>
                <button type="button" onClick={() => handleSaveWorkoutSession(workout)}>
                  Salvar execucao atual
                </button>
                {renderPreviousSession(workout)}
              </div>

              {workout.exercises.map((exercise) => (
                <section key={exercise.id} className="exercise-card">
                  <div className="exercise-card__top">
                    <div>
                      <h4>{exercise.name}</h4>
                      <span>
                        Sugestao: {exercise.suggestedSets} series de {exercise.suggestedReps} reps
                      </span>
                    </div>
                    <label className="exercise-video-upload">
                      Enviar video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) =>
                          handleVideoUpload(workout.id, exercise.id, event.target.files?.[0])
                        }
                      />
                    </label>
                  </div>

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
                      <small>Somente o Personal Virtual altera series e repeticoes prescritas.</small>
                    </div>

                    <label>
                      Video demonstrativo
                      <input
                        value={exercise.executionVideoUrl}
                        onChange={(event) =>
                          handleExerciseChange(workout.id, exercise.id, "executionVideoUrl", event.target.value)
                        }
                        placeholder="URL do video de execucao"
                      />
                    </label>
                    <label>
                      Feedback do Personal Virtual
                      <textarea
                        value={exercise.aiFeedback}
                        onChange={(event) =>
                          handleExerciseChange(workout.id, exercise.id, "aiFeedback", event.target.value)
                        }
                        placeholder="Feedback tecnico gerado pelo Personal Virtual apos analisar o video ou as anotacoes"
                      />
                      <button
                        type="button"
                        className="feedback-request-button"
                        onClick={() =>
                          handleRequestExerciseFeedback(workout.id, exercise.id, "video")
                        }
                      >
                        Solicitar feedback do video
                      </button>
                    </label>
                  </div>

                  <div className="set-log-grid">
                    {exercise.sets.map((set, index) => (
                      <div
                        key={set.set}
                        className={`set-log-row ${set.enabled ? "is-enabled" : "is-disabled"}`}
                      >
                        <strong>Serie {set.set}</strong>
                        <input
                          value={set.weight}
                          disabled={!set.enabled}
                          onChange={(event) =>
                            handleSetChange(workout.id, exercise.id, index, "weight", event.target.value)
                          }
                          placeholder="kg"
                        />
                        <input
                          value={set.reps}
                          disabled={!set.enabled}
                          onChange={(event) =>
                            handleSetChange(workout.id, exercise.id, index, "reps", event.target.value)
                          }
                          placeholder="reps"
                        />
                      </div>
                    ))}
                  </div>

                  <label className="exercise-notes">
                    Anotacoes
                    <textarea
                      value={exercise.notes}
                      onChange={(event) =>
                        handleExerciseChange(workout.id, exercise.id, "notes", event.target.value)
                      }
                      placeholder="Carga sentida, dor, RPE, ajuste de tecnica..."
                    />
                    <button
                      type="button"
                      className="feedback-request-button"
                      onClick={() =>
                        handleRequestExerciseFeedback(workout.id, exercise.id, "notes")
                      }
                    >
                      Solicitar feedback das anotacoes
                    </button>
                  </label>
                </section>
              ))}
            </div> : null}
          </article>
        ))}
      </div>

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
    content.title = `Treino ${workoutId}`;
    content.footerNote = `Rota dinamica funcionando em /treinos/${workoutId}. Depois ela deve buscar o treino real pelo id no backend.`;
  }

  return (
    <div className="workouts-page">
      <header className="workouts-clean-hero glass-panel">
        <span>{content.badge}</span>
        <h1>{content.title}</h1>
        <p>
          Plano de treino, execução, vídeos e histórico de cargas do protocolo atual.
        </p>
      </header>
      {["list", "generate"].includes(viewKey) ? <WorkoutExecutionSection /> : null}
    </div>
  );
}
