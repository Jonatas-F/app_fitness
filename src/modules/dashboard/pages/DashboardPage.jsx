import { Suspense, lazy, useEffect, useState } from "react";
import {
  Activity,
  CalendarRange,
  ClipboardCheck,
  Dumbbell,
  Gauge,
  MoonStar,
  Scale,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionCard from "@/components/ui/SectionCard";
import StatusPill from "@/components/ui/StatusPill";
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

const DashboardCharts = lazy(() => import("./DashboardCharts"));

function DashboardChartLoading({ label = "Carregando graficos..." }) {
  return (
    <div className="dashboard-chart-loading" role="status" aria-live="polite">
      {label}
    </div>
  );
}

function numberValue(value) {
  if (value === null || value === undefined) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const parsed = Number(normalized.replace(",", ".").replace(/[^\d.-]/g, ""));
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

function getTrendPercent(currentValue, previousValue) {
  const current = numberValue(currentValue);
  const previous = numberValue(previousValue);

  if (current === null || previous === null || previous === 0) {
    return null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function addTrendDeltas(data, keys) {
  const previousValues = {};

  return data.map((item) => {
    const next = { ...item };

    keys.forEach((key) => {
      const current = numberValue(item[key]);
      const trend = current !== null ? getTrendPercent(current, previousValues[key]) : null;

      if (trend !== null) {
        next[`${key}TrendPercent`] = trend;
      }

      if (current !== null) {
        previousValues[key] = current;
      }
    });

    return next;
  });
}

function formatMonthLabel(date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
  }).replace(".", "");
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

  return { loadsByDate: addTrendDeltas(loadsByDate, ["totalLoad"]) };
}

function buildMonthlyActivityData(sessions, checkins) {
  const today = new Date();

  const data = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const month = date.getMonth();
    const year = date.getFullYear();

    return {
      label: formatMonthLabel(date),
      treinos: sessions.filter((session) => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate.getMonth() === month && sessionDate.getFullYear() === year;
      }).length,
      checkins: checkins.filter((checkin) => {
        const checkinDate = new Date(checkin.createdAt);
        return checkinDate.getMonth() === month && checkinDate.getFullYear() === year;
      }).length,
    };
  });

  return addTrendDeltas(data, ["treinos", "checkins"]);
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

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("resumo");
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
  const monthlyActivityData = buildMonthlyActivityData(sessions, checkins);
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
      icon: Dumbbell,
    },
    {
      label: "Treinos no mes",
      value: `${monthSessions.length}`,
      helper: `${sessions.length} no total`,
      icon: CalendarRange,
    },
    {
      label: "Treinos no ano",
      value: `${yearSessions.length}`,
      helper: "Sessoes registradas",
      icon: Activity,
    },
    {
      label: "Maior carga",
      value: `${workoutSummary.maxWeight || "--"} kg`,
      helper: `${workoutSummary.completedSets} series registradas`,
      icon: Gauge,
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
          <div className="dashboard-hero__meta">
            <div className="dashboard-hero__metric">
              <ClipboardCheck aria-hidden="true" />
              <span>
                <strong>{weeklyCheckins.length} check-ins</strong>
                <small>{adherencePercent(weeklyCheckins.length, weeklyCheckinTotal)} de aderencia semanal</small>
              </span>
            </div>
            <div className="dashboard-hero__metric">
              <MoonStar aria-hidden="true" />
              <span>
                <strong>{average(weeklyCheckins, "sleep")}h</strong>
                <small>sono medio nos registros recentes</small>
              </span>
            </div>
            <div className="dashboard-hero__metric">
              <Scale aria-hidden="true" />
              <span>
                <strong>{average(monthlyCheckins, "weight")} kg</strong>
                <small>peso medio do ciclo atual</small>
              </span>
            </div>
            <div className="dashboard-hero__metric">
              <TrendingUp aria-hidden="true" />
              <span>
                <strong>{monthSessions.length} treinos</strong>
                <small>sessoes registradas nos ultimos 30 dias</small>
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="dashboard-metrics">
        {metrics.map((item) => (
          <SectionCard
            key={item.label}
            className="dashboard-metric glass-panel"
            eyebrow={item.label}
            title={item.value}
            description={item.helper}
            badge={
              <StatusPill tone="danger" className="dashboard-metric__badge" aria-hidden="true">
                <item.icon />
              </StatusPill>
            }
          />
        ))}
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="dashboard-tabs-root">
        <TabsList className="dashboard-tabs" variant="line">
          <TabsTrigger value="resumo" className="dashboard-tab-trigger">
            <strong>Resumo</strong>
            <StatusPill tone="neutral">{weeklyCheckins.length} check-ins</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="corpo" className="dashboard-tab-trigger">
            <strong>Corpo</strong>
            <StatusPill tone="neutral">{checkins.length} registros</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="cargas" className="dashboard-tab-trigger">
            <strong>Cargas</strong>
            <StatusPill tone="neutral">{monthSessions.length} treinos</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="mensal" className="dashboard-tab-trigger">
            <strong>Mensal</strong>
            <StatusPill tone="neutral">{monthlyCheckins.length} registros</StatusPill>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="dashboard-tab-trigger">
            <strong>Feedback</strong>
            <StatusPill tone="warning">{feedbacks.length} alertas</StatusPill>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="dashboard-tab-panel">
          <section className="dashboard-grid dashboard-grid--nested">
            <article className="dashboard-card dashboard-card--nested glass-panel">
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

            <article className="dashboard-card dashboard-card--nested glass-panel">
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

            <article className="dashboard-card dashboard-card--nested glass-panel">
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

          <Suspense fallback={<DashboardChartLoading label="Carregando aderencia..." />}>
            <DashboardCharts
              type="adherence"
              weeklyCheckins={weeklyCheckins.length}
              weeklyCheckinTotal={weeklyCheckinTotal}
              monthlyCheckins={monthlyCheckins.length}
              monthlyCheckinTotal={monthlyCheckinTotal}
              monthlyActivityData={monthlyActivityData}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="corpo" className="dashboard-tab-panel">
          <Suspense fallback={<DashboardChartLoading label="Carregando graficos corporais..." />}>
            <DashboardCharts type="body" bodyChartGroups={bodyChartGroups} checkins={checkins} />
          </Suspense>
        </TabsContent>

        <TabsContent value="cargas" className="dashboard-tab-panel">
          <section className="dashboard-grid dashboard-grid--wide dashboard-grid--nested">
            <article className="dashboard-card dashboard-card--nested glass-panel">
              <h2>Evolucao de cargas</h2>
              <p>Volume estimado por sessoes salvas: peso x repeticoes.</p>
              <Suspense fallback={<DashboardChartLoading label="Carregando cargas..." />}>
                <DashboardCharts type="load" data={loadsByDate} />
              </Suspense>
            </article>

            <article className="dashboard-card dashboard-card--nested glass-panel">
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
        </TabsContent>

        <TabsContent value="mensal" className="dashboard-tab-panel">
          <section className="dashboard-grid dashboard-grid--nested">
            <article className="dashboard-card dashboard-card--nested glass-panel">
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

            <article className="dashboard-card dashboard-card--nested glass-panel">
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

          <Suspense fallback={<DashboardChartLoading label="Carregando evolucao dos treinos..." />}>
            <DashboardCharts
              type="workoutEvolution"
              workouts={workoutPlan.workouts}
              sessions={sessions}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="feedback" className="dashboard-tab-panel">
          <div className="virtual-feedback-grid">
            {feedbacks.map((item) => (
              <article key={item.title} className="glass-panel">
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
