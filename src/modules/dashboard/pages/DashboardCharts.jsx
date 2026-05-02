import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SectionCollapsible from "@/components/ui/SectionCollapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const chartPalette = ["#ff2e2e", "#ff6b6b", "#f2f2f2", "#d1d1d1", "#a8a8a8", "#b8b8b8", "#ffffff"];
const chartAxisStyle = { fill: "rgba(255, 255, 255, 0.58)", fontSize: 12 };
const donutColors = ["#ff2e2e", "rgba(255, 255, 255, 0.13)"];

function numberValue(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).trim().replace(",", ".").replace(/[^\d.-]/g, ""));
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

function formatDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getTrendPercent(currentValue, previousValue) {
  const current = numberValue(currentValue);
  const previous = numberValue(previousValue);
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function addTrendDeltas(data, keys) {
  const previousValues = {};

  return data.map((item) => {
    const next = { ...item };

    keys.forEach((key) => {
      const current = numberValue(item[key]);
      const trend = current !== null ? getTrendPercent(current, previousValues[key]) : null;
      if (trend !== null) next[`${key}TrendPercent`] = trend;
      if (current !== null) previousValues[key] = current;
    });

    return next;
  });
}

function adherencePercent(done, total) {
  return total ? `${Math.min(100, Math.round((done / total) * 100))}%` : "--";
}

function makeDonutData(done, total) {
  const safeDone = Math.max(0, done);
  const missing = Math.max(0, total - safeDone);

  return [
    { name: "Realizados", value: safeDone || 0 },
    { name: "Pendentes", value: missing || (total ? 0 : 1) },
  ];
}

function makeBodyChartData(checkins, fields) {
  const rowsByDate = [...checkins]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .reduce((groups, item) => {
      const date = formatDateInputValue(item.createdAt);
      if (!date) return groups;

      const row = groups.get(date) || {
        id: date,
        date,
        label: formatShortDate(item.createdAt),
      };

      fields.forEach((field) => {
        const value = numberValue(item[field.key]);
        if (value !== null) row[field.key] = value;
      });

      groups.set(date, row);
      return groups;
    }, new Map());

  return addTrendDeltas(Array.from(rowsByDate.values()), fields.map((field) => field.key));
}

function formatChartValueLabel(value) {
  if (value === undefined || value === null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toFixed(number % 1 === 0 ? 0 : 1);
}

function formatTrendPercent(value) {
  const trend = Number(value);
  if (!Number.isFinite(trend)) return "";
  return `${trend >= 0 ? "+" : "-"}${Math.abs(trend).toFixed(1)}%`;
}

function getTrendClass(value) {
  const trend = Number(value);
  if (!Number.isFinite(trend) || trend === 0) return "is-neutral";
  return trend > 0 ? "is-positive" : "is-negative";
}

function ChartValueLabel({ x, y, width, value, index, dataKey, data }) {
  if (x === undefined || y === undefined || value === undefined || value === null) return null;
  const trend = data?.[index]?.[`${dataKey}TrendPercent`];
  const trendLabel = formatTrendPercent(trend);
  const labelX = typeof width === "number" ? x + width / 2 : x;

  return (
    <text className="dashboard-chart-point-label" x={labelX} y={y - 6} textAnchor="middle">
      <tspan>{formatChartValueLabel(value)}</tspan>
      {trendLabel ? <tspan className={getTrendClass(trend)} dx="4">{trendLabel}</tspan> : null}
    </text>
  );
}

function ChartXAxisTick({ x, y, payload, missingLabels }) {
  return (
    <text
      className={`dashboard-chart-x-tick${missingLabels?.has(payload?.value) ? " is-missing" : ""}`}
      x={x}
      y={y + 14}
      textAnchor="middle"
    >
      {payload?.value}
    </text>
  );
}

function getChartDomain(data, fields, zoomLevel = 1) {
  const values = data.flatMap((item) =>
    fields.map((field) => item[field.key]).filter((value) => typeof value === "number")
  );

  if (!values.length) return ["auto", "auto"];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, Math.abs(max) * 0.025, 1);
  const padding = (range * 0.48) / Math.min(2.6, Math.max(0.55, zoomLevel));

  return [Number((min - padding).toFixed(2)), Number((max + padding).toFixed(2))];
}

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="dashboard-chart-tooltip">
      <strong>{label}</strong>
      {payload
        .filter((item) => item.value !== undefined && item.value !== null)
        .map((item) => {
          const trend = item.payload?.[`${item.dataKey}TrendPercent`];
          const trendLabel = formatTrendPercent(trend);

          return (
            <span key={item.dataKey}>
              <i style={{ background: item.color || item.fill }} />
              <b>{item.name}: {formatChartValueLabel(item.value)}</b>
              {trendLabel ? <em className={getTrendClass(trend)}>{trendLabel}</em> : null}
            </span>
          );
        })}
    </div>
  );
}

function DashboardEmptyState({ title, description }) {
  return (
    <div className="dashboard-empty-state" role="status">
      <span className="dashboard-empty-state__icon">
        <Inbox aria-hidden="true" />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function BodyLineChart({ title, fields, checkins }) {
  const [activeFieldKeys, setActiveFieldKeys] = useState(() => fields.map((field) => field.key));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [yZoomLevel, setYZoomLevel] = useState(1);
  const data = makeBodyChartData(checkins, fields);
  const hasData = data.some((item) => fields.some((field) => typeof item[field.key] === "number"));
  const activeFields = fields.filter((field) => activeFieldKeys.includes(field.key));
  const visibleFields = activeFields.length ? activeFields : fields;
  const firstDate = data[0]?.date || "";
  const lastDate = data[data.length - 1]?.date || "";
  const selectedStartDate = startDate || firstDate;
  const selectedEndDate = endDate || lastDate;
  const chartData = data.filter((item) => {
    if (!item.date) return false;
    if (selectedStartDate && item.date < selectedStartDate) return false;
    if (selectedEndDate && item.date > selectedEndDate) return false;
    return true;
  });
  const labelDataStatus = chartData.reduce((status, item) => {
    status[item.label] = visibleFields.some((field) => typeof item[field.key] === "number");
    return status;
  }, {});
  const missingLabels = new Set(
    Object.entries(labelDataStatus).filter(([, hasVisibleData]) => !hasVisibleData).map(([label]) => label)
  );
  const domain = getChartDomain(chartData, visibleFields, yZoomLevel);
  const chartId = slugify(title);

  useEffect(() => {
    if (!data.length) return;
    setStartDate((current) => current || data[0].date);
    setEndDate((current) => current || data[data.length - 1].date);
  }, [data]);

  function handleFieldClick(fieldKey) {
    setActiveFieldKeys((current) =>
      current.length === 1 && current[0] === fieldKey ? fields.map((field) => field.key) : [fieldKey]
    );
    setYZoomLevel(1);
  }

  function handleZoomReset() {
    setStartDate(firstDate);
    setEndDate(lastDate);
    setYZoomLevel(1);
  }

  return (
    <article className="body-chart dashboard-chart-shell">
      <header className="dashboard-chart-header">
        <h3>{title}</h3>
        <span>{hasData ? `${chartData.length}/${data.length} registros` : "sem dados"}</span>
      </header>

      {hasData ? (
        <>
          <div className="dashboard-chart-controls" aria-label={`Zoom da escala de ${title}`}>
            <label className="dashboard-chart-date-control">
              <span className="dashboard-chart-scale">Data inicial</span>
              <input type="date" min={firstDate} max={selectedEndDate || lastDate} value={selectedStartDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="dashboard-chart-date-control">
              <span className="dashboard-chart-scale">Data final</span>
              <input type="date" min={selectedStartDate || firstDate} max={lastDate} value={selectedEndDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <label className="dashboard-chart-zoom-slider dashboard-chart-y-slider">
              <span className="dashboard-chart-scale">Eixo Y {Math.round(yZoomLevel * 100)}%</span>
              <input type="range" min="0.55" max="2.6" step="0.05" value={yZoomLevel} onChange={(event) => setYZoomLevel(Number(event.target.value))} />
              <span className="dashboard-chart-zoom-hint">
                <small>mais aberto</small>
                <small>mais fechado</small>
              </span>
            </label>
            <button type="button" onClick={handleZoomReset}>Resetar</button>
          </div>
          <div className="dashboard-chart-area">
            {chartData.length ? null : <p className="dashboard-chart-empty">Nao ha registros no periodo selecionado.</p>}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  {fields.map((field, index) => (
                    <linearGradient key={field.key} id={`body-${chartId}-${field.key}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor={chartPalette[index % chartPalette.length]} stopOpacity={0.26} />
                      <stop offset="95%" stopColor={chartPalette[index % chartPalette.length]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
                <XAxis dataKey="label" tick={(props) => <ChartXAxisTick {...props} missingLabels={missingLabels} />} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={48} domain={domain} allowDataOverflow={false} tickFormatter={(value) => Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)} />
                <Tooltip content={<DashboardTooltip />} />
                {fields.map((field, index) =>
                  activeFieldKeys.includes(field.key) ? (
                    <Area
                      key={field.key}
                      type="monotone"
                      dataKey={field.key}
                      name={field.label}
                      stroke={chartPalette[index % chartPalette.length]}
                      fill={`url(#body-${chartId}-${field.key})`}
                      strokeWidth={activeFieldKeys.length === 1 ? 3 : 2.2}
                      dot={{ r: activeFieldKeys.length === 1 ? 4 : 3, strokeWidth: 0, fill: chartPalette[index % chartPalette.length] }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: chartPalette[index % chartPalette.length] }}
                      connectNulls
                      isAnimationActive={false}
                    >
                      <LabelList dataKey={field.key} position="top" content={(props) => <ChartValueLabel {...props} dataKey={field.key} data={chartData} />} />
                    </Area>
                  ) : null
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="dashboard-chart-legend" aria-label={`Selecionar linhas de ${title}`}>
            {fields.map((field, index) => {
              const isActive = activeFieldKeys.includes(field.key);
              return (
                <button
                  key={field.key}
                  type="button"
                  className={isActive ? "is-active" : ""}
                  onClick={() => handleFieldClick(field.key)}
                  title={isActive && activeFieldKeys.length === 1 ? "Mostrar todos novamente" : `Isolar ${field.label}`}
                >
                  <i style={{ background: chartPalette[index % chartPalette.length] }} />
                  {field.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <DashboardEmptyState title="Sem check-ins suficientes" description="Salve check-ins com essas medidas para montar esse grafico e acompanhar a evolucao." />
      )}
    </article>
  );
}

function LoadBarChart({ data }) {
  if (!data.length) {
    return <DashboardEmptyState title="Sem carga registrada" description="Salve execucoes de treino para montar o grafico de carga e comparar sessoes." />;
  }

  return (
    <div className="load-chart dashboard-chart-area">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
          <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={48} />
          <Tooltip content={<DashboardTooltip />} />
          <Bar dataKey="totalLoad" name="Volume" fill="#ff2e2e" radius={[8, 8, 3, 3]} isAnimationActive={false}>
            <LabelList dataKey="totalLoad" position="top" content={(props) => <ChartValueLabel {...props} dataKey="totalLoad" data={data} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AdherenceDonutChart({ title, done, total, helper }) {
  const data = makeDonutData(done, total);

  return (
    <article className="dashboard-donut-card dashboard-chart-shell">
      <div className="dashboard-donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="92%" paddingAngle={total ? 3 : 0} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={1} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={total ? donutColors[index % donutColors.length] : "rgba(255, 255, 255, 0.1)"} />
              ))}
            </Pie>
            <Tooltip content={<DashboardTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <strong>{adherencePercent(done, total)}</strong>
      </div>
      <div>
        <h3>{title}</h3>
        <p>{helper}</p>
        <span>{done}/{total || 0} registros</span>
      </div>
    </article>
  );
}

function MonthlyActivityChart({ data }) {
  return (
    <article className="dashboard-card dashboard-card--nested dashboard-chart-shell">
      <h2>Atividade dos ultimos meses</h2>
      <p>Comparativo entre sessoes de treino e check-ins salvos.</p>
      <div className="dashboard-chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255, 255, 255, 0.07)" vertical={false} />
            <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<DashboardTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 12 }} />
            <Bar dataKey="treinos" name="Treinos" fill="#ff2e2e" radius={[8, 8, 3, 3]} isAnimationActive={false}>
              <LabelList dataKey="treinos" position="top" content={(props) => <ChartValueLabel {...props} dataKey="treinos" data={data} />} />
            </Bar>
            <Bar dataKey="checkins" name="Check-ins" fill="#f2f2f2" radius={[8, 8, 3, 3]} isAnimationActive={false}>
              <LabelList dataKey="checkins" position="top" content={(props) => <ChartValueLabel {...props} dataKey="checkins" data={data} />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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

function WorkoutEvolutionPanel({ workouts, sessions }) {
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

export default function DashboardCharts({ type, ...props }) {
  if (type === "adherence") {
    return (
      <section className="dashboard-insight-grid">
        <AdherenceDonutChart title="Aderencia semanal" done={props.weeklyCheckins} total={props.weeklyCheckinTotal} helper="Check-ins feitos versus gaps registrados na semana." />
        <AdherenceDonutChart title="Aderencia mensal" done={props.monthlyCheckins} total={props.monthlyCheckinTotal} helper="Base para acompanhar consistencia do ciclo." />
        <MonthlyActivityChart data={props.monthlyActivityData} />
      </section>
    );
  }

  if (type === "body") {
    return (
      <div className="body-chart-grid">
        {props.bodyChartGroups.map((group) => (
          <BodyLineChart key={group.title} title={group.title} fields={group.fields} checkins={props.checkins} />
        ))}
      </div>
    );
  }

  if (type === "load") {
    return <LoadBarChart data={props.data} />;
  }

  if (type === "workoutEvolution") {
    return <WorkoutEvolutionPanel workouts={props.workouts} sessions={props.sessions} />;
  }

  return null;
}
