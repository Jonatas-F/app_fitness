function MetricCard({ label, value, trend }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <h3 className="metric-value">{value}</h3>
      <p className="metric-trend">{trend}</p>
    </div>
  );
}

export default MetricCard;