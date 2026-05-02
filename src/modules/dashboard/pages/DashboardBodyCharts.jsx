import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  addTrendDeltas,
  ChartValueLabel,
  chartAxisStyle,
  chartPalette,
  DashboardEmptyState,
  DashboardTooltip,
  formatDateInputValue,
  formatShortDate,
  numberValue,
  slugify,
} from "./DashboardChartUtils";

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
        <DashboardEmptyState
          title="Sem check-ins suficientes"
          description="Salve check-ins com essas medidas para montar esse grafico e acompanhar a evolucao."
        />
      )}
    </article>
  );
}

export default function DashboardBodyCharts({ bodyChartGroups, checkins }) {
  return (
    <div className="body-chart-grid">
      {bodyChartGroups.map((group) => (
        <BodyLineChart key={group.title} title={group.title} fields={group.fields} checkins={checkins} />
      ))}
    </div>
  );
}
