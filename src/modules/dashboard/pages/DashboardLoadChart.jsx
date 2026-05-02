import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ChartValueLabel,
  chartAxisStyle,
  DashboardEmptyState,
  DashboardTooltip,
} from "./DashboardChartUtils";

export default function DashboardLoadChart({ data }) {
  if (!data.length) {
    return (
      <DashboardEmptyState
        title="Sem carga registrada"
        description="Salve execucoes de treino para montar o grafico de carga e comparar sessoes."
      />
    );
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
            <LabelList
              dataKey="totalLoad"
              position="top"
              content={(props) => <ChartValueLabel {...props} dataKey="totalLoad" data={data} />}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
