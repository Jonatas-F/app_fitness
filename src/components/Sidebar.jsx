function Sidebar({ navItems, activePage, onChangePage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">SF</div>
        <div className="brand-text">
          <h2>Shape Fitness IA</h2>
          <span>Evolução inteligente</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`nav-item ${activePage === item.label ? "active" : ""}`}
            type="button"
            onClick={() => onChangePage(item.label)}
          >
            <span className="nav-icon">{item.short}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="glass-card card-padding mt-24">
        <div className="card-header">
          <div>
            <h3 className="card-title">Status do plano</h3>
            <p className="card-subtitle">Seu acompanhamento está em evolução contínua.</p>
          </div>
          <span className="badge badge-success">Ativo</span>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: "72%" }} />
        </div>

        <p className="text-secondary mt-12">
          72% da meta mensal concluída com base em treino, dieta e monitoramento.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;