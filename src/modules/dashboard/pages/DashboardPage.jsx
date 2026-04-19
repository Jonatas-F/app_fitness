import { useState } from "react";
import { loadCheckins } from "../../../data/checkinStorage";
import { loadTrainingHistory } from "../../../data/trainingStorage";
import {
  getWorkoutDashboardSummary,
  loadWorkoutExecution,
  loadWorkoutSessionHistory,
} from "../../../data/workoutExecutionStorage";
import logoMark from "../../../assets/logo.svg";
import "./DashboardPage.css";

function numberValue(value) {
  const parsed = Number(String(value || "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function within(dateValue, startDate) {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date >= startDate;
}

function average(items, field) {
  const values = items
    .map((item) => numberValue(item[field]))
    .filter((value) => value !== null);

  if (!values.length) return "--";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function completedCheckins(allCheckins) {
  return allCheckins.filter((item) => item.status !== "missed");
}

function compareLatestCheckins(checkins) {
  const [latest, previous] = checkins;

  if (!latest || !previous) {
    return {
      weight: "--",
      bodyFat: "--",
      muscleMass: "--",
      leanMass: "--",
      message: "Salve pelo menos dois check-ins para comparar evolucao.",
    };
  }

  const diff = (field) => {
    const a = numberValue(latest[field]);
    const b = numberValue(previous[field]);
    return a !== null && b !== null ? (a - b).toFixed(1) : "--";
  };

  return {
    weight: diff("weight"),
    bodyFat: diff("bodyFat"),
    muscleMass: diff("muscleMass"),
    leanMass: diff("leanMass"),
    message: "Comparacao entre os dois check-ins realizados mais recentes.",
  };
}

function summarizeLoads(sessions) {
  const loadsByDate = sessions.map((session) => {
    const totalLoad = session.exercises.reduce(
      (exerciseSum, exercise) =>
        exerciseSum +
        exercise.sets.reduce((setSum, set) => {
          const weight = numberValue(set.weight) || 0;
          const reps = numberValue(set.reps) || 0;
          return setSum + weight * reps;
        }, 0),
      0
    );

    return {
      date: session.createdAt,
      label: new Date(session.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      totalLoad,
      workoutTitle: session.workoutTitle,
    };
  });

  const maxLoad = loadsByDate.reduce((max, item) => Math.max(max, item.totalLoad), 0);

  return { loadsByDate, maxLoad };
}

function buildCalendar(allCheckins, sessions) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const hasTraining = sessions.some((session) => session.createdAt.slice(0, 10) === dateKey);
    const hasMissed = allCheckins.some(
      (checkin) => checkin.createdAt.slice(0, 10) === dateKey && checkin.status === "missed"
    );
    const hasCheckin = allCheckins.some(
      (checkin) => checkin.createdAt.slice(0, 10) === dateKey && checkin.status !== "missed"
    );

    return {
      day,
      status: hasTraining ? "trained" : hasMissed ? "missed" : hasCheckin ? "checkin" : "empty",
    };
  });
}

function makeFeedbacks({ weekSessions, monthSessions, checkins, trainingHistory }) {
  const sleep = average(checkins, "sleep");
  const adherence = average(checkins, "adherence");
  const latest = checkins[0];
  const previous = checkins[1];
  const weightDiff =
    latest && previous && numberValue(latest.weight) !== null && numberValue(previous.weight) !== null
      ? numberValue(latest.weight) - numberValue(previous.weight)
      : null;

  const protocolDirection =
    monthSessions.length >= 12 && Number(adherence) >= 80
      ? "O proximo protocolo pode evoluir em volume, carga ou complexidade, porque a execucao recente indica boa aderencia."
      : monthSessions.length < 6 || Number(adherence) < 65
        ? "O proximo protocolo deve ser facilitado ou reorganizado, porque houve baixa frequencia, baixa aderencia ou pouco dado confiavel."
        : "O protocolo pode ser mantido com ajustes pontuais enquanto mais dados sao registrados.";

  return [
    {
      title: "Sono e recuperacao",
      text:
        sleep === "--"
          ? "Ainda nao ha dados suficientes de sono para orientar recuperacao."
          : `Sono medio registrado: ${sleep}h. O Personal Virtual deve considerar esse dado antes de aumentar volume.`,
    },
    {
      title: "Alimentacao e aderencia",
      text:
        adherence === "--"
          ? "Registre aderencia nos check-ins para cruzar dieta, treino e progresso."
          : `Aderencia media: ${adherence}%. Esse valor ajuda a decidir se o protocolo progride ou fica mais simples.`,
    },
    {
      title: "Mudanca de protocolo",
      text: protocolDirection,
    },
    {
      title: "Evolucao corporal",
      text:
        weightDiff === null
          ? "Dois check-ins completos permitem comparar peso, gordura e massa muscular."
          : `Variacao recente de peso: ${weightDiff.toFixed(1)} kg. Combine com bioimpedancia antes de concluir ganho ou perda real.`,
    },
    {
      title: "Historico mensal",
      text: `${trainingHistory.length} protocolo(s) anterior(es) arquivado(s). Esses registros ajudam a explicar progresso, regressao ou troca de estimulo.`,
    },
  ];
}

const bodyChartGroups = [
  {
    title: "Peso, gordura e massa muscular",
    fields: [
      { key: "weight", label: "Peso" },
      { key: "bodyFat", label: "Gordura" },
      { key: "muscleMass", label: "Massa muscular" },
    ],
  },
  {
    title: "Massa muscular por segmento",
    fields: [
      { key: "rightArmMuscleMass", label: "Braço D" },
      { key: "leftArmMuscleMass", label: "Braço E" },
      { key: "rightLegMuscleMass", label: "Perna D" },
      { key: "leftLegMuscleMass", label: "Perna E" },
      { key: "trunkMuscleMass", label: "Tronco" },
    ],
  },
  {
    title: "Gordura por segmento",
    fields: [
      { key: "rightArmFat", label: "Braço D" },
      { key: "leftArmFat", label: "Braço E" },
      { key: "rightLegFat", label: "Perna D" },
      { key: "leftLegFat", label: "Perna E" },
      { key: "trunkFat", label: "Tronco" },
    ],
  },
  {
    title: "Medidas corporais",
    fields: [
      { key: "waist", label: "Cintura" },
      { key: "abdomen", label: "Abdomen" },
      { key: "hip", label: "Quadril" },
      { key: "rightArmMeasure", label: "Braço D" },
      { key: "leftArmMeasure", label: "Braço E" },
      { key: "rightThighMeasure", label: "Coxa D" },
      { key: "leftThighMeasure", label: "Coxa E" },
    ],
  },
];

function BodyLineChart({ title, fields, checkins }) {
  const points = checkins.slice(0, 6).reverse();
  const values = points.flatMap((item) =>
    fields.map((field) => numberValue(item[field.key])).filter((value) => value !== null)
  );
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

  return (
    <article className="body-chart">
      <h3>{title}</h3>
      <div className="body-chart__plot">
        {fields.map((field, fieldIndex) => (
          <div key={field.key} className={`body-chart__line body-chart__line--${fieldIndex + 1}`}>
            {points.map((item, index) => {
              const value = numberValue(item[field.key]);
              const left = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100;
              const bottom = value === null ? 0 : ((value - min) / range) * 86 + 7;

              return value === null ? null : (
                <span
                  key={`${field.key}-${item.id}`}
                  style={{ left: `${left}%`, bottom: `${bottom}%` }}
                  title={`${field.label}: ${value}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="body-chart__legend">
        {fields.map((field, index) => (
          <span key={field.key} className={`body-chart__legend-item body-chart__legend-item--${index + 1}`}>
            {field.label}
          </span>
        ))}
      </div>
    </article>
  );
}

function getExerciseVolume(exercise) {
  return exercise.sets.reduce((sum, set) => {
    const weight = numberValue(set.weight) || 0;
    const reps = numberValue(set.reps) || 0;
    return sum + weight * reps;
  }, 0);
}

function buildWorkoutEvolution(workout, sessions) {
  const monthlySessions = sessions
    .filter((session) => session.workoutId === workout.id && within(session.createdAt, daysAgo(30)))
    .slice(0, 6)
    .reverse();

  const exerciseRows = workout.exercises.map((exercise) => {
    const sessionValues = monthlySessions.map((session) => {
      const sessionExercise = session.exercises.find(
        (item) => item.id === exercise.id || item.name === exercise.name
      );
      return sessionExercise ? getExerciseVolume(sessionExercise) : 0;
    });
    const first = sessionValues.find((value) => value > 0) || 0;
    const latest = [...sessionValues].reverse().find((value) => value > 0) || 0;

    return {
      id: exercise.id,
      name: exercise.name,
      values: sessionValues,
      first,
      latest,
      diff: latest - first,
    };
  });

  const maxValue = exerciseRows.reduce(
    (max, exercise) => Math.max(max, ...exercise.values),
    0
  );

  return {
    sessionCount: monthlySessions.length,
    labels: monthlySessions.map((session) =>
      new Date(session.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      })
    ),
    exerciseRows,
    maxValue,
  };
}

function WorkoutEvolutionPanel({ workouts, sessions }) {
  const firstEnabledWorkout = workouts.find((workout) => workout.enabled)?.id || "monday";
  const [openWorkoutId, setOpenWorkoutId] = useState(firstEnabledWorkout);

  return (
    <section className="dashboard-card glass-panel">
      <h2>Evolucao por treino do protocolo mensal</h2>
      <p>
        Selecione um dia da semana para comparar a evolucao de carga dos
        exercicios registrados neste protocolo mensal.
      </p>

      <div className="workout-evolution-tabs">
        {workouts.map((workout) => (
          <button
            key={workout.id}
            type="button"
            className={`${openWorkoutId === workout.id ? "is-selected" : ""} ${
              workout.enabled ? "is-enabled" : "is-disabled"
            }`}
            disabled={!workout.enabled}
            onClick={() => setOpenWorkoutId((current) => (current === workout.id ? "" : workout.id))}
          >
            <strong>{workout.title}</strong>
            <span>{workout.enabled ? "Habilitado" : "Desabilitado"}</span>
          </button>
        ))}
      </div>

      {workouts.map((workout) => {
        if (workout.id !== openWorkoutId || !workout.enabled) {
          return null;
        }

        const evolution = buildWorkoutEvolution(workout, sessions);

        return (
          <article key={workout.id} className="workout-evolution-panel">
            <header>
              <div>
                <h3>{workout.title}</h3>
                <p>{workout.focus}</p>
              </div>
              <span>{evolution.sessionCount} registro(s) no mes</span>
            </header>

            {evolution.sessionCount ? (
              <>
                <div className="workout-evolution-labels">
                  {evolution.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="workout-evolution-list">
                  {evolution.exerciseRows.map((exercise) => (
                    <section key={exercise.id} className="workout-evolution-exercise">
                      <div className="workout-evolution-exercise__heading">
                        <strong>{exercise.name}</strong>
                        <small>
                          {exercise.latest || "--"} kg/reps volume |{" "}
                          {exercise.diff > 0 ? "+" : ""}
                          {exercise.diff}
                        </small>
                      </div>
                      <div className="workout-evolution-bars">
                        {exercise.values.map((value, index) => (
                          <span key={`${exercise.id}-${index}`}>
                            <i
                              style={{
                                height: `${evolution.maxValue ? Math.max(6, (value / evolution.maxValue) * 100) : 0}%`,
                              }}
                            />
                          </span>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <p>
                Salve execucoes desse treino na aba Treinos para gerar os
                comparativos de carga por exercicio.
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default function DashboardPage() {
  const allCheckins = loadCheckins();
  const checkins = completedCheckins(allCheckins);
  const missedCheckins = allCheckins.filter((item) => item.status === "missed");
  const workoutPlan = loadWorkoutExecution();
  const sessions = loadWorkoutSessionHistory();
  const trainingHistory = loadTrainingHistory();
  const workoutSummary = getWorkoutDashboardSummary(workoutPlan);
  const comparison = compareLatestCheckins(checkins);
  const weekSessions = sessions.filter((session) => within(session.createdAt, daysAgo(7)));
  const monthSessions = sessions.filter((session) => within(session.createdAt, daysAgo(30)));
  const yearSessions = sessions.filter((session) => within(session.createdAt, daysAgo(365)));
  const weeklyCheckins = checkins.filter((checkin) => within(checkin.createdAt, daysAgo(7)));
  const monthlyCheckins = checkins.filter((checkin) => within(checkin.createdAt, daysAgo(30)));
  const calendarDays = buildCalendar(allCheckins, sessions);
  const { loadsByDate, maxLoad } = summarizeLoads(sessions.slice(0, 8).reverse());
  const feedbacks = makeFeedbacks({
    weekSessions,
    monthSessions,
    checkins,
    trainingHistory,
  });

  const metrics = [
    {
      label: "Treinos na semana",
      value: `${weekSessions.length}`,
      helper: `${workoutSummary.weeklyTrainingDays} dia(s) planejados`,
    },
    {
      label: "Treinos no mes",
      value: `${monthSessions.length}`,
      helper: `${sessions.length} no total`,
    },
    {
      label: "Treinos no ano",
      value: `${yearSessions.length}`,
      helper: "Sessoes registradas",
    },
    {
      label: "Maior carga",
      value: `${workoutSummary.maxWeight || "--"} kg`,
      helper: `${workoutSummary.completedSets} series registradas`,
    },
  ];

  return (
    <section className="dashboard-page">
      <header className="dashboard-hero glass-panel">
        <div className="dashboard-hero__logo">
          <img src={logoMark} alt="Shape Certo" />
        </div>
        <div>
          <span>Dashboard</span>
          <h1>Acompanhamento semanal, mensal e historico.</h1>
          <p>
            Evolucao de treinos, cargas, sono, alimentacao, check-ins e composicao corporal em um unico painel.
          </p>
        </div>
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
          <h2>Comparacao corporal</h2>
          <p>{comparison.message}</p>
          <div className="dashboard-comparison">
            <div>
              <span>Peso</span>
              <strong>{comparison.weight} kg</strong>
            </div>
            <div>
              <span>Gordura</span>
              <strong>{comparison.bodyFat}%</strong>
            </div>
            <div>
              <span>Massa muscular</span>
              <strong>{comparison.muscleMass} kg</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card glass-panel">
          <h2>Check-ins e qualidade da semana</h2>
          <p>Leitura com base nos registros recentes.</p>
          <div className="dashboard-comparison">
            <div>
              <span>Check-ins semanais</span>
              <strong>{weeklyCheckins.length}</strong>
            </div>
            <div>
              <span>Sono medio</span>
              <strong>{average(weeklyCheckins, "sleep")}h</strong>
            </div>
            <div>
              <span>Aderencia</span>
              <strong>{average(weeklyCheckins, "adherence")}%</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-card glass-panel">
        <h2>Bioimpedância e medidas</h2>
        <p>Gráficos de linha com os últimos registros do check-in mensal.</p>
        <div className="body-chart-grid">
          {bodyChartGroups.map((group) => (
            <BodyLineChart
              key={group.title}
              title={group.title}
              fields={group.fields}
              checkins={checkins}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--wide">
        <article className="dashboard-card glass-panel">
          <h2>Evolucao de cargas</h2>
          <p>Volume estimado por sessoes salvas: peso x repeticoes.</p>
          <div className="load-chart">
            {loadsByDate.length ? (
              loadsByDate.map((item) => (
                <div key={`${item.date}-${item.workoutTitle}`} className="load-chart__bar">
                  <span style={{ height: `${maxLoad ? Math.max(8, (item.totalLoad / maxLoad) * 100) : 0}%` }} />
                  <small>{item.label}</small>
                </div>
              ))
            ) : (
              <p>Salve execucoes de treino para montar o grafico de carga.</p>
            )}
          </div>
        </article>

        <article className="dashboard-card glass-panel">
          <h2>Calendario do mes</h2>
          <p>Treino realizado, check-in preenchido e ausencia registrada.</p>
          <div className="training-calendar">
            {calendarDays.map((item) => (
              <span key={item.day} className={`calendar-day calendar-day--${item.status}`}>
                {item.day}
              </span>
            ))}
          </div>
          <div className="calendar-legend">
            <span className="calendar-day--trained">Treino</span>
            <span className="calendar-day--checkin">Check-in</span>
            <span className="calendar-day--missed">Falta</span>
          </div>
        </article>
      </section>

      <WorkoutEvolutionPanel workouts={workoutPlan.workouts} sessions={sessions} />

      <section className="dashboard-grid">
        <article className="dashboard-card glass-panel">
          <h2>Evolucao mensal</h2>
          <div className="dashboard-comparison">
            <div>
              <span>Check-ins no mes</span>
              <strong>{monthlyCheckins.length}</strong>
            </div>
            <div>
              <span>Peso medio</span>
              <strong>{average(monthlyCheckins, "weight")} kg</strong>
            </div>
            <div>
              <span>Gordura media</span>
              <strong>{average(monthlyCheckins, "bodyFat")}%</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card glass-panel">
          <h2>Protocolos de treino</h2>
          <div className="dashboard-workout-list">
            {workoutPlan.workouts.map((workout) => (
              <div key={workout.id}>
                <strong>{workout.title}</strong>
                <span>{workout.enabled ? "Habilitado" : "Desabilitado"} | {workout.exercises.length} exercicios</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-card glass-panel">
        <h2>Feedbacks do Personal Virtual</h2>
        <div className="virtual-feedback-grid">
          {feedbacks.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
