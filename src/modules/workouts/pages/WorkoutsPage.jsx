import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ModulePageLayout from "../../../components/ModulePageLayout";
import { workoutsViews } from "../../../data/appData";
import {
  loadWorkoutExecution,
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
  const [openWorkouts, setOpenWorkouts] = useState(() =>
    plan.workouts.slice(0, 1).map((workout) => workout.id)
  );

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

  function handleSetCountChange(workoutId, exerciseId, value) {
    const nextCount = Math.max(1, Math.min(8, Number(value) || 1));

    updatePlan({
      ...plan,
      workouts: plan.workouts.map((workout) =>
        workout.id !== workoutId
          ? workout
          : {
              ...workout,
              exercises: workout.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;

                const nextSets = Array.from({ length: nextCount }, (_, index) => ({
                  set: index + 1,
                  weight: exercise.sets[index]?.weight || "",
                  reps: exercise.sets[index]?.reps || "",
                }));

                return {
                  ...exercise,
                  suggestedSets: String(nextCount),
                  sets: nextSets,
                };
              }),
            }
      ),
    });
  }

  function toggleWorkout(workoutId) {
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
            className={`workout-day-card ${openWorkouts.includes(workout.id) ? "is-open" : ""}`}
          >
            <div className="workout-day-card__header">
              <button
                type="button"
                className="workout-day-card__toggle"
                onClick={() => toggleWorkout(workout.id)}
                aria-expanded={openWorkouts.includes(workout.id)}
              >
                <span>{openWorkouts.includes(workout.id) ? "−" : "+"}</span>
                <div>
                  <h3>{workout.title}</h3>
                  <p>{workout.focus}</p>
                </div>
              </button>
              <strong>{workout.exercises.length} exercicios</strong>
            </div>

            {openWorkouts.includes(workout.id) ? <div className="exercise-list">
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
                    <label>
                      Series prescritas
                      <select
                        value={exercise.sets.length}
                        onChange={(event) =>
                          handleSetCountChange(workout.id, exercise.id, event.target.value)
                        }
                      >
                        {["1", "2", "3", "4", "5", "6", "7", "8"].map((count) => (
                          <option key={count} value={count}>
                            {count} serie{count === "1" ? "" : "s"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Repeticoes sugeridas
                      <input
                        value={exercise.suggestedReps}
                        onChange={(event) =>
                          handleExerciseChange(workout.id, exercise.id, "suggestedReps", event.target.value)
                        }
                        placeholder="Ex.: 8-12"
                      />
                    </label>
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
                      Feedback da IA
                      <textarea
                        value={exercise.aiFeedback}
                        onChange={(event) =>
                          handleExerciseChange(workout.id, exercise.id, "aiFeedback", event.target.value)
                        }
                        placeholder="Feedback tecnico gerado pela IA apos analisar o video"
                      />
                    </label>
                  </div>

                  <div className="set-log-grid">
                    {exercise.sets.map((set, index) => (
                      <div key={set.set} className="set-log-row">
                        <strong>Serie {set.set}</strong>
                        <input
                          value={set.weight}
                          onChange={(event) =>
                            handleSetChange(workout.id, exercise.id, index, "weight", event.target.value)
                          }
                          placeholder="kg"
                        />
                        <input
                          value={set.reps}
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
                  </label>
                </section>
              ))}
            </div> : null}
          </article>
        ))}
      </div>
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
      <ModulePageLayout {...content} />
      {["list", "generate"].includes(viewKey) ? <WorkoutExecutionSection /> : null}
    </div>
  );
}
