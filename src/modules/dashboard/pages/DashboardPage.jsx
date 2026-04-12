import { loadCheckins } from "../../../data/checkinStorage";
import {
  getWorkoutDashboardSummary,
  loadWorkoutExecution,
} from "../../../data/workoutExecutionStorage";
import "./DashboardPage.css";

function completedCheckins() {
  return loadCheckins().filter((item) => item.status !== "missed");
}

function compareLatestCheckins(checkins) {
  const [latest, previous] = checkins;

  if (!latest || !previous) {
    return {
      weight: "--",
      adherence: "--",
      energy: "--",
      message: "Salve pelo menos dois check-ins para comparar evolucao.",
    };
  }

  const diff = (field) => {
    const a = Number(String(latest[field] || "").replace(",", "."));
    const b = Number(String(previous[field] || "").replace(",", "."));
    return Number.isFinite(a) && Number.isFinite(b) ? (a - b).toFixed(1) : "--";
  };

  return {
    weight: diff("weight"),
    adherence: diff("adherence"),
    energy: diff("energy"),
    message: "Comparacao entre os dois check-ins realizados mais recentes.",
  };
}

export default function DashboardPage() {
  const checkins = completedCheckins();
  const missedCheckins = loadCheckins().filter((item) => item.status === "missed");
  const workoutPlan = loadWorkoutExecution();
  const workoutSummary = getWorkoutDashboardSummary(workoutPlan);
  const comparison = compareLatestCheckins(checkins);

  const metrics = [
    {
      label: "Treinos planejados",
      value: `${workoutSummary.workoutCount}`,
      helper: `${workoutSummary.split} | ${workoutSummary.weeklyTrainingDays} dia(s)`,
    },
    {
      label: "Series registradas",
      value: `${workoutSummary.completedSets}`,
      helper: `Maior carga: ${workoutSummary.maxWeight || "--"} kg`,
    },
    {
      label: "Check-ins realizados",
      value: `${checkins.length}`,
      helper: `${missedCheckins.length} ausencia(s) registradas`,
    },
    {
      label: "Exercicios no plano",
      value: `${workoutSummary.exerciseCount}`,
      helper: `Turno: ${workoutSummary.trainingShift}`,
    },
  ];

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero glass-panel">
        <span>Dashboard</span>
        <h1>Acompanhamento de check-ins, treino e cargas.</h1>
        <p>
          Este painel consolida os registros locais para mostrar aderencia,
          evolucao de carga e comparacao entre check-ins.
        </p>
      </header>

      <section className="dashboard-metrics">
        {metrics.map((item) => (
          <article key={item.label} className="module-stat glass-panel">
            <span className="module-stat__label">{item.label}</span>
            <strong className="module-stat__value">{item.value}</strong>
            <span className="module-stat__helper">{item.helper}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card glass-panel">
          <h2>Comparacao de check-ins</h2>
          <p>{comparison.message}</p>
          <div className="dashboard-comparison">
            <div>
              <span>Peso</span>
              <strong>{comparison.weight}</strong>
            </div>
            <div>
              <span>Aderencia</span>
              <strong>{comparison.adherence}</strong>
            </div>
            <div>
              <span>Energia</span>
              <strong>{comparison.energy}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card glass-panel">
          <h2>Evolucao de cargas</h2>
          <p>
            Cargas e repeticoes registradas nos treinos alimentam esta leitura.
          </p>
          <div className="dashboard-workout-list">
            {workoutPlan.workouts.map((workout) => (
              <div key={workout.id}>
                <strong>{workout.title}</strong>
                <span>{workout.exercises.length} exercicios</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
