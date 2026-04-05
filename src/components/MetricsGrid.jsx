import MetricCard from "./MetricCard";

function MetricsGrid({ metrics = [] }) {
  return (
    <section className="grid grid-4 mt-24">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          trend={metric.trend}
        />
      ))}
    </section>
  );
}

export default MetricsGrid;