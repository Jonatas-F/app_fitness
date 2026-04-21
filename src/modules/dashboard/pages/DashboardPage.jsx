import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadCheckins } from "../../../data/checkinStorage";
import { loadTrainingHistory } from "../../../data/trainingStorage";
import {
  getWorkoutDashboardSummary,
  hydrateWorkoutExecutionFromApi,
  hydrateWorkoutSessionsFromApi,
  loadWorkoutExecution,
  loadWorkoutSessionHistory,
} from "../../../data/workoutExecutionStorage";
import logoMark from "../../../assets/logo.svg";
import "./DashboardPage.css";

const chartPalette = ["#ff2e2e", "#ff6b6b", "#f2f2f2", "#d1d1d1", "#a8a8a8", "#b8b8b8", "#ffffff"];
const chartAxisStyle = { fill: "rgba(255, 255, 255, 0.58)", fontSize: 12 };

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

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

function formatShortDate(value) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function adherencePercent(done, total) {
  return total ? `${Math.min(100, Math.round((done / total) * 100))}%` : "--";
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

  return { loadsByDate };
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

function makeBodyChartData(checkins, fields) {
  return checkins.slice(0, 8).reverse().map((item) => {
    const row = {
      id: item.id,
      label: formatShortDate(item.createdAt),
    };

    fields.forEach((field) => {
      const value = numberValue(item[field.key]);
      if (value !== null) {
        row[field.key] = value;
      }
    });

    return row;
  });
}

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="dashboard-chart-tooltip">
      <strong>{label}</strong>
      {payload
        .filter((item) => item.value !== undefined && item.value !== null)
        .map((item) => (
          <span key={item.dataKey}>
            <i style={{ background: item.color || item.fill }} />
            {item.name}: {item.value}
          </span>
        ))}
    </div>
  );
}

function BodyLineChart({ title, fields, checkins }) {
  const data = makeBodyChartData(checkins, fields);
  const hasData = data.some((item) => fields.some((field) => typeof item[field.key] === "number"));
  const chartId = slugify(title);

  return (
    <article className="body-chart dashboard-chart-shell">
      <header className="dashboard-chart-header">
        <h3>{title}</h3>
        <span>{hasData ? `${data.length} registros` : "sem dados"}</span>
      </header>

      {hasData ? (
        <div className="dashboard-chart-area">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                {fields.map((field, index) => (
                  <linearGradient key={field.key} id={`body-${chartId}-${field.key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chartPalette[index % chartPalette.length]} stopOpacity={0.26} />
                    <stop offset="95%" stopColor={chartPalette[index % chartPalette.length]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
              <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<DashboardTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 12 }} />
              {fields.map((field, index) => (
                <Area
                  key={field.key}
                  type="monotone"
                  dataKey={field.key}
                  name={field.label}
                  stroke={chartPalette[index % chartPalette.length]}
                  fill={`url(#body-${chartId}-${field.key})`}
                  strokeWidth={2.2}
                  dot={{ r: 3, strokeWidth: 0, fill: chartPalette[index % chartPalette.length] }}
                  activeDot={{ r: 5, strokeWidth: 0, fill: chartPalette[index % chartPalette.length] }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="dashboard-chart-empty">Salve check-ins com esses dados para montar o grafico.</p>
      )}
    </article>
  );
}

function LoadBarChart({ data }) {
  if (!data.length) {
    return <p className="dashboard-chart-empty">Salve execucoes de treino para montar o grafico de carga.</p>;
  }

  return (
    <div className="load-chart dashboard-chart-area">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
          <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<DashboardTooltip />} />
          <Bar
            dataKey="totalLoad"
            name="Volume"
            fill="#ff2e2e"
            radius={[8, 8, 3, 3]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DashboardCollapsible({ eyebrow, title, summary, badge, children }) {
  return (
    <details className="dashboard-collapsible glass-panel">
      <summary className="dashboard-collapsible__summary">
        <span className="dashboard-collapsible__icon">+</span>
        <span>
          {eyebrow ? <small>{eyebrow}</small> : null}
          <strong>{title}</strong>
          {summary ? <em>{summary}</em> : null}
        </span>
        {badge ? <mark>{badge}</mark> : null}
      </summary>
      <div className="dashboard-collapsible__body">{children}</div>
    </details>
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

function ExerciseVolumeChart({ exercise, labels }) {
  const data = exercise.values.map((value, index) => ({
    label: labels[index] || `S${index + 1}`,
    value,
  }));

  return (
    <div className="workout-evolution-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
          <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<DashboardTooltip />} />
          <Bar
            dataKey="value"
            name="Volume"
            fill="#ff2e2e"
            radius={[8, 8, 3, 3]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WorkoutEvolutionPanel({ workouts, sessions }) {
  const firstEnabledWorkout = workouts.find((workout) => workout.enabled)?.id || "monday";
  const [openWorkoutId, setOpenWorkoutId] = useState(firstEnabledWorkout);

  return (
    <DashboardCollapsible
      eyebrow="Treinos"
      title="Evolucao por treino do protocolo mensal"
      summary="Comparativo de carga por dia da semana."
      badge={`${workouts.filter((workout) => workout.enabled).length} ativos`}
    >
      <div className="dashboard-card dashboard-card--nested">
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
                        <ExerciseVolumeChart exercise={exercise} labels={evolution.labels} />
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
      </div>
    </DashboardCollapsible>
  );
}

export default function DashboardPage() {
  const [, setRemoteRefresh] = useState(0);
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
  const weeklyMissedCheckins = missedCheckins.filter((checkin) => within(checkin.createdAt, daysAgo(7)));
  const monthlyMissedCheckins = missedCheckins.filter((checkin) => within(checkin.createdAt, daysAgo(30)));
  const weeklyCheckinTotal = weeklyCheckins.length + weeklyMissedCheckins.length;
  const monthlyCheckinTotal = monthlyCheckins.length + monthlyMissedCheckins.length;
  const calendarDays = buildCalendar(allCheckins, sessions);
  const { loadsByDate } = summarizeLoads(sessions.slice(0, 8).reverse());
  const feedbacks = makeFeedbacks({
    weekSessions,
    monthSessions,
    checkins,
    trainingHistory,
  });

  useEffect(() => {
    let ignore = false;

    async function hydrateDashboardWorkouts() {
      await hydrateWorkoutExecutionFromApi();
      await hydrateWorkoutSessionsFromApi();

      if (!ignore) {
        setRemoteRefresh((current) => current + 1);
      }
    }

    hydrateDashboardWorkouts();

    return () => {
      ignore = true;
    };
  }, []);

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

      <DashboardCollapsible
        eyebrow="Resumo"
        title="Comparacao corporal e qualidade da semana"
        summary="Peso, gordura, massa muscular, check-ins, sono e aderencia."
        badge={`${weeklyCheckins.length} check-ins`}
      >
        <section className="dashboard-grid dashboard-grid--nested">
          <article className="dashboard-card dashboard-card--nested">
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

          <article className="dashboard-card dashboard-card--nested">
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

          <article className="dashboard-card dashboard-card--nested">
            <h2>Aderencia aos check-ins</h2>
            <p>Realizados e gaps registrados ficam concentrados aqui para consulta.</p>
            <div className="dashboard-comparison">
              <div>
                <span>Semana</span>
                <strong>{adherencePercent(weeklyCheckins.length, weeklyCheckinTotal)}</strong>
              </div>
              <div>
                <span>Gaps semanais</span>
                <strong>{weeklyMissedCheckins.length}</strong>
              </div>
              <div>
                <span>Mes</span>
                <strong>{adherencePercent(monthlyCheckins.length, monthlyCheckinTotal)}</strong>
              </div>
            </div>
          </article>
        </section>
      </DashboardCollapsible>

      <DashboardCollapsible
        eyebrow="Corpo"
        title="Bioimpedancia e medidas"
        summary="Graficos de linha com os ultimos registros do check-in mensal."
        badge={`${checkins.length} check-ins`}
      >
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
      </DashboardCollapsible>

      <DashboardCollapsible
        eyebrow="Calendario e cargas"
        title="Evolucao de cargas e calendario do mes"
        summary="Volume por sessoes salvas, treinos realizados, check-ins e faltas."
        badge={`${monthSessions.length} treinos`}
      >
        <section className="dashboard-grid dashboard-grid--wide dashboard-grid--nested">
          <article className="dashboard-card dashboard-card--nested">
            <h2>Evolucao de cargas</h2>
            <p>Volume estimado por sessoes salvas: peso x repeticoes.</p>
            <LoadBarChart data={loadsByDate} />
          </article>

          <article className="dashboard-card dashboard-card--nested">
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
      </DashboardCollapsible>

      <WorkoutEvolutionPanel workouts={workoutPlan.workouts} sessions={sessions} />

      <DashboardCollapsible
        eyebrow="Mensal"
        title="Evolucao mensal e protocolos de treino"
        summary="Medias do mes e divisao atual do protocolo."
        badge={`${monthlyCheckins.length} registros`}
      >
        <section className="dashboard-grid dashboard-grid--nested">
          <article className="dashboard-card dashboard-card--nested">
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

          <article className="dashboard-card dashboard-card--nested">
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
      </DashboardCollapsible>

      <DashboardCollapsible
        eyebrow="Feedback"
        title="Feedbacks do Personal Virtual"
        summary="Leituras de sono, alimentacao, protocolo e evolucao corporal."
        badge={`${feedbacks.length} alertas`}
      >
        <div className="virtual-feedback-grid">
          {feedbacks.map((item) => (
            <article key={item.title}>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </DashboardCollapsible>
    </section>
  );
}
