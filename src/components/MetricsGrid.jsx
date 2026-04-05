function MetricsGrid({ metrics = [] }) {
  return (
    <section className="grid grid-4 mt-24">
      {metrics.map((metric) => (
        <div key={metric.label} className="metric-card">
          <p className="metric-label">{metric.label}</p>
          <h3 className="metric-value">{metric.value}</h3>
          <p className="metric-trend">{metric.trend}</p>
        </div>
      ))}
    </section>
  );
}

export default MetricsGrid;