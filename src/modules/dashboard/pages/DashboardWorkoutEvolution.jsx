import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import SectionCollapsible from "@/components/ui/SectionCollapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addTrendDeltas,
  ChartValueLabel,
  chartAxisStyle,
  DashboardEmptyState,
  DashboardTooltip,
  daysAgo,
  formatShortDate,
  numberValue,
  within,
} from "./DashboardChartUtils";

function getExerciseVolume(exercise) {
  return exercise.sets.reduce((sum, set) => {
    const weight = numberValue(set.weight) || 0;
    const reps = numberValue(set.reps) || 0;
    return sum + weight * reps;
  }, 0);
}

function getSetWeight(set) {
  return numberValue(set?.weight) || 0;
}

function getSetReps(set) {
  return numberValue(set?.reps) || 0;
}

function getAverageExerciseWeight(exercise) {
  const sets = (exercise?.sets || []).filter((set) => getSetWeight(set) > 0);
  if (!sets.length) return 0;
  return sets.reduce((sum, set) => sum + getSetWeight(set), 0) / sets.length;
}

function formatSigned(value, suffix = "") {
  if (!Number.isFinite(value)) return "--";
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded}${suffix}`;
}

function buildWorkoutEvolution(workout, sessions) {
  const monthlySessions = sessions
    .filter((session) => session.workoutId === workout.id && within(session.createdAt, daysAgo(30)))
    .slice(0, 6)
    .reverse();
  const latestSession = monthlySessions[monthlySessions.length - 1];
  const previousSession = monthlySessions[monthlySessions.length - 2];

  const exerciseRows = workout.exercises.map((exercise) => {
    const sessionValues = monthlySessions.map((session) => {
      const sessionExercise = session.exercises.find((item) => item.id === exercise.id || item.name === exercise.name);
      return sessionExercise ? getExerciseVolume(sessionExercise) : 0;
    });
    const first = sessionValues.find((value) => value > 0) || 0;
    const latest = [...sessionValues].reverse().find((value) => value > 0) || 0;
    const latestExercise = latestSession?.exercises.find((item) => item.id === exercise.id || item.name === exercise.name);
    const previousExercise = previousSession?.exercises.find((item) => item.id === exercise.id || item.name === exercise.name);
    const latestAverageWeight = getAverageExerciseWeight(latestExercise);
    const previousAverageWeight = getAverageExerciseWeight(previousExercise);
    const maxSetCount = Math.max(latestExercise?.sets?.length || 0, previousExercise?.sets?.length || 0, exercise.sets?.filter((set) => set.enabled !== false).length || 0);
    const setRows = Array.from({ length: maxSetCount }, (_, index) => {
      const latestSet = latestExercise?.sets?.[index];
      const previousSet = previousExercise?.sets?.[index];
      const latestWeight = getSetWeight(latestSet);
      const previousWeight = getSetWeight(previousSet);
      const latestReps = getSetReps(latestSet);
      const previousReps = getSetReps(previousSet);

      return {
        set: index + 1,
        latestWeight,
        previousWeight,
        weightDiff: latestWeight - previousWeight,
        latestReps,
        previousReps,
        repsDiff: latestReps - previousReps,
      };
    });

    return {
      id: exercise.id,
      name: exercise.name,
      values: sessionValues,
      first,
      latest,
      diff: latest - first,
      sessionVolumeDiff: latest - (previousSession ? sessionValues[sessionValues.length - 2] || 0 : latest),
      averageWeightDiff: latestAverageWeight - previousAverageWeight,
      setRows,
    };
  });

  return {
    sessionCount: monthlySessions.length,
    labels: monthlySessions.map((session) => formatShortDate(session.createdAt)),
    latestLabel: latestSession ? formatShortDate(latestSession.createdAt) : "--",
    previousLabel: previousSession ? formatShortDate(previousSession.createdAt) : "--",
    exerciseRows,
  };
}

function ExerciseVolumeChart({ exercise, labels }) {
  const data = addTrendDeltas(exercise.values.map((value, index) => ({
    label: labels[index] || `S${index + 1}`,
    value,
  })), ["value"]);

  return (
    <div className="workout-evolution-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
          <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<DashboardTooltip />} />
          <Bar dataKey="value" name="Volume" fill="#ff2e2e" radius={[8, 8, 3, 3]} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" content={(props) => <ChartValueLabel {...props} dataKey="value" data={data} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardWorkoutEvolution({ workouts, sessions }) {
  const firstEnabledWorkout = workouts.find((workout) => workout.enabled)?.id || "monday";
  const [openWorkoutId, setOpenWorkoutId] = useState(firstEnabledWorkout);
  const enabledWorkouts = workouts.filter((workout) => workout.enabled);

  return (
    <SectionCollapsible
      className="dashboard-collapsible glass-panel"
      summaryClassName="dashboard-collapsible__summary"
      bodyClassName="dashboard-collapsible__body"
      eyebrow="Treinos"
      title="Evolucao por treino do protocolo mensal"
      summary="Comparativo de carga por dia da semana."
      badge={`${enabledWorkouts.length} ativos`}
    >
      <div className="dashboard-card dashboard-card--nested">
        <p>Selecione um dia da semana para comparar a evolucao de carga dos exercicios registrados neste protocolo mensal.</p>

        <Tabs value={openWorkoutId} onValueChange={setOpenWorkoutId} className="workout-evolution-tabs-root">
          <TabsList className="workout-evolution-tabs" variant="line">
            {workouts.map((workout) => (
              <TabsTrigger key={workout.id} value={workout.id} disabled={!workout.enabled} className={`workout-evolution-trigger ${workout.enabled ? "is-enabled" : "is-disabled"}`}>
                <strong>{workout.title}</strong>
                <span>{workout.enabled ? "Habilitado" : "Desabilitado"}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {enabledWorkouts.map((workout) => {
            const evolution = buildWorkoutEvolution(workout, sessions);

            return (
              <TabsContent key={workout.id} value={workout.id}>
                <article className="workout-evolution-panel">
                  <header>
                    <div>
                      <h3>{workout.title}</h3>
                      <p>{workout.focus}</p>
                    </div>
                    <span>{evolution.sessionCount} registro(s) | {evolution.previousLabel} para {evolution.latestLabel}</span>
                  </header>

                  {evolution.sessionCount ? (
                    <div className="workout-evolution-list">
                      {evolution.exerciseRows.map((exercise) => (
                        <section key={exercise.id} className="workout-evolution-exercise">
                          <div className="workout-evolution-exercise__heading">
                            <strong>{exercise.name}</strong>
                            <small>{exercise.latest || "--"} kg/reps volume | {exercise.diff > 0 ? "+" : ""}{exercise.diff}</small>
                            <div className="workout-evolution-deltas">
                              <span>Media carga {formatSigned(exercise.averageWeightDiff, " kg")}</span>
                              <span>Ultimo treino {formatSigned(exercise.sessionVolumeDiff)}</span>
                            </div>
                          </div>
                          <div className="workout-evolution-detail">
                            <ExerciseVolumeChart exercise={exercise} labels={evolution.labels} />
                            <div className="workout-set-diff-table" aria-label={`Diferenca por serie de ${exercise.name}`}>
                              <div>
                                <strong>Serie</strong>
                                <strong>Anterior</strong>
                                <strong>Atual</strong>
                                <strong>Delta</strong>
                              </div>
                              {exercise.setRows.map((set) => (
                                <div key={set.set}>
                                  <span>{set.set}</span>
                                  <span>{set.previousWeight || "--"} kg x {set.previousReps || "--"}</span>
                                  <span>{set.latestWeight || "--"} kg x {set.latestReps || "--"}</span>
                                  <span className={set.weightDiff >= 0 ? "is-positive" : "is-negative"}>
                                    {formatSigned(set.weightDiff, " kg")}
                                    {set.repsDiff ? ` / ${formatSigned(set.repsDiff, " rep")}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <DashboardEmptyState title="Sem execucoes desse treino" description="Salve execucoes na aba Treinos para gerar comparativos de carga por exercicio." />
                  )}
                </article>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </SectionCollapsible>
  );
}
