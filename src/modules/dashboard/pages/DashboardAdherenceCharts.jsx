import {
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
import {
  adherencePercent,
  ChartValueLabel,
  chartAxisStyle,
  DashboardTooltip,
  donutColors,
  makeDonutData,
} from "./DashboardChartUtils";

function AdherenceDonutChart({ title, done, total, helper }) {
  const data = makeDonutData(done, total);

  return (
    <article className="dashboard-donut-card dashboard-chart-shell">
      <div className="dashboard-donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="92%"
              paddingAngle={total ? 3 : 0}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={1}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={total ? donutColors[index % donutColors.length] : "rgba(255, 255, 255, 0.1)"}
                />
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

export default function DashboardAdherenceCharts({
  weeklyCheckins,
  weeklyCheckinTotal,
  monthlyCheckins,
  monthlyCheckinTotal,
  monthlyActivityData,
}) {
  return (
    <section className="dashboard-insight-grid">
      <AdherenceDonutChart
        title="Aderencia semanal"
        done={weeklyCheckins}
        total={weeklyCheckinTotal}
        helper="Check-ins feitos versus gaps registrados na semana."
      />
      <AdherenceDonutChart
        title="Aderencia mensal"
        done={monthlyCheckins}
        total={monthlyCheckinTotal}
        helper="Base para acompanhar consistencia do ciclo."
      />
      <MonthlyActivityChart data={monthlyActivityData} />
    </section>
  );
}
