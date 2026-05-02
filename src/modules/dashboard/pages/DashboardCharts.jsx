import { Suspense, lazy } from "react";

const DashboardAdherenceCharts = lazy(() => import("./DashboardAdherenceCharts"));
const DashboardBodyCharts = lazy(() => import("./DashboardBodyCharts"));
const DashboardLoadChart = lazy(() => import("./DashboardLoadChart"));
const DashboardWorkoutEvolution = lazy(() => import("./DashboardWorkoutEvolution"));

function NestedChartLoading({ label = "Carregando visualizacao..." }) {
  return (
    <div className="dashboard-chart-loading dashboard-chart-loading--nested" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export default function DashboardCharts({ type, ...props }) {
  if (type === "adherence") {
    return (
      <Suspense fallback={<NestedChartLoading label="Carregando aderencia..." />}>
        <DashboardAdherenceCharts {...props} />
      </Suspense>
    );
  }

  if (type === "body") {
    return (
      <Suspense fallback={<NestedChartLoading label="Carregando graficos corporais..." />}>
        <DashboardBodyCharts {...props} />
      </Suspense>
    );
  }

  if (type === "load") {
    return (
      <Suspense fallback={<NestedChartLoading label="Carregando cargas..." />}>
        <DashboardLoadChart {...props} />
      </Suspense>
    );
  }

  if (type === "workoutEvolution") {
    return (
      <Suspense fallback={<NestedChartLoading label="Carregando evolucao dos treinos..." />}>
        <DashboardWorkoutEvolution {...props} />
      </Suspense>
    );
  }

  return null;
}
