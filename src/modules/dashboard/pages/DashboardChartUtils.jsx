import { Inbox } from "lucide-react";

export const chartPalette = ["#ff2e2e", "#ff6b6b", "#f2f2f2", "#d1d1d1", "#a8a8a8", "#b8b8b8", "#ffffff"];
export const chartAxisStyle = { fill: "rgba(255, 255, 255, 0.58)", fontSize: 12 };
export const donutColors = ["#ff2e2e", "rgba(255, 255, 255, 0.13)"];

export function numberValue(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).trim().replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function within(dateValue, startDate) {
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date >= startDate;
}

export function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
}

export function formatShortDate(value) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function getTrendPercent(currentValue, previousValue) {
  const current = numberValue(currentValue);
  const previous = numberValue(previousValue);
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function addTrendDeltas(data, keys) {
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

export function adherencePercent(done, total) {
  return total ? `${Math.min(100, Math.round((done / total) * 100))}%` : "--";
}

export function makeDonutData(done, total) {
  const safeDone = Math.max(0, done);
  const missing = Math.max(0, total - safeDone);

  return [
    { name: "Realizados", value: safeDone || 0 },
    { name: "Pendentes", value: missing || (total ? 0 : 1) },
  ];
}

export function formatChartValueLabel(value) {
  if (value === undefined || value === null || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toFixed(number % 1 === 0 ? 0 : 1);
}

export function formatTrendPercent(value) {
  const trend = Number(value);
  if (!Number.isFinite(trend)) return "";
  return `${trend >= 0 ? "+" : "-"}${Math.abs(trend).toFixed(1)}%`;
}

export function getTrendClass(value) {
  const trend = Number(value);
  if (!Number.isFinite(trend) || trend === 0) return "is-neutral";
  return trend > 0 ? "is-positive" : "is-negative";
}

export function ChartValueLabel({ x, y, width, value, index, dataKey, data }) {
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

export function DashboardTooltip({ active, payload, label }) {
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

export function DashboardEmptyState({ title, description }) {
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
