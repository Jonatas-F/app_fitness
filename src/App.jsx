const navItems = [
  { label: "Dashboard", short: "DB", active: true },
  { label: "Treinos", short: "TR" },
  { label: "Dieta", short: "DI" },
  { label: "Progresso", short: "PR" },
  { label: "Check-ins", short: "CK" },
  { label: "Chat IA", short: "IA" },
  { label: "Perfil", short: "PF" },
];

const metrics = [
  { label: "Peso atual", value: "84,6 kg", trend: "-1,4 kg nas últimas 3 semanas" },
  { label: "Meta principal", value: "Hipertrofia", trend: "Plano ajustado com foco em massa magra" },
  { label: "Aderência", value: "87%", trend: "Excelente constância nos últimos 7 dias" },
  { label: "Próximo check-in", value: "2 dias", trend: "Atualização corporal recomendada" },
];

const workoutCards = [
  {
    title: "Treino de hoje",
    subtitle: "Peito, ombro e tríceps",
    items: ["Supino reto — 4x10", "Desenvolvimento — 4x12", "Tríceps corda — 3x15"],
    badge: "Treino atual",
  },
  {
    title: "Dieta do dia",
    subtitle: "2.450 kcal planejadas",
    items: ["Proteína: 180g", "Carboidrato: 250g", "Gordura: 70g"],
    badge: "Plano alimentar",
  },
  {
    title: "Evolução",
    subtitle: "Resumo da semana",
    items: ["Sono médio: 7h12", "Energia: alta", "Desempenho: em crescimento"],
    badge: "Análise IA",
  },
];

const quickInsights = [
  "Sua consistência está acima da média das últimas semanas.",
  "A IA sugere manter a progressão de carga nos exercícios principais.",
  "Seu consumo de água está abaixo da meta ideal em 2 dos últimos 5 dias.",
  "Novo check-in com foto pode melhorar a precisão dos ajustes.",
];

function App() {
  return (
    <div className="app-shell">
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
              className={`nav-item ${item.active ? "active" : ""}`}
              type="button"
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
              <p className="card-subtitle">Sua rotina está em evolução constante.</p>
            </div>
            <span className="badge badge-success">Ativo</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: "72%" }} />
          </div>

          <p className="text-secondary mt-12">
            72% da meta mensal concluída com base em treinos, dieta e check-ins.
          </p>
        </div>
      </aside>

      <main className="page-content">
        <div className="page-container">
          <header className="topbar">
            <div className="brand">
              <div className="brand-text">
                <h1>Dashboard</h1>
                <span>Seu centro de controle fitness com IA</span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="secondary-button" type="button">
                Novo check-in
              </button>
              <button className="primary-button" type="button">
                Falar com a IA
              </button>
            </div>
          </header>

          <section className="hero-card">
            <span className="eyebrow">Plano inteligente em andamento</span>

            <h2 className="hero-title">
              Evolua com treinos, dieta e ajustes automáticos baseados no seu progresso.
            </h2>

            <p className="hero-description">
              Este app foi pensado para funcionar como um ecossistema fitness completo:
              acompanhamento corporal, orientação alimentar, treino personalizado e análises
              inteligentes em uma experiência moderna, visual e motivadora.
            </p>

            <div className="hero-actions">
              <button className="primary-button" type="button">
                Ver treino de hoje
              </button>
              <button className="ghost-button" type="button">
                Revisar dieta atual
              </button>
            </div>
          </section>

          <section className="grid grid-4 mt-24">
            {metrics.map((metric) => (
              <div key={metric.label} className="metric-card">
                <p className="metric-label">{metric.label}</p>
                <h3 className="metric-value">{metric.value}</h3>
                <p className="metric-trend">{metric.trend}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-3 mt-24">
            {workoutCards.map((card) => (
              <article key={card.title} className="glass-card card-padding">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{card.title}</h3>
                    <p className="card-subtitle">{card.subtitle}</p>
                  </div>
                  <span className="badge badge-primary">{card.badge}</span>
                </div>

                <div className="data-list">
                  {card.items.map((item) => (
                    <div key={item} className="data-row">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="grid grid-2 mt-24">
            <article className="glass-card card-padding">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Resumo semanal</h3>
                  <p className="card-subtitle">
                    Visão rápida do que mais impactou sua evolução.
                  </p>
                </div>
                <span className="badge badge-warning">IA</span>
              </div>

              <div className="data-list">
                {quickInsights.map((insight) => (
                  <div key={insight} className="data-row">
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass-card card-padding">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Próximas ações</h3>
                  <p className="card-subtitle">
                    Pequenos passos para manter sua rotina forte.
                  </p>
                </div>
                <span className="badge badge-success">Hoje</span>
              </div>

              <div className="data-list">
                <div className="data-row">
                  <span>Concluir treino A até 20h</span>
                  <span className="text-muted">Prioridade alta</span>
                </div>
                <div className="data-row">
                  <span>Registrar ingestão de água</span>
                  <span className="text-muted">Meta diária</span>
                </div>
                <div className="data-row">
                  <span>Confirmar refeição pós-treino</span>
                  <span className="text-muted">Plano atual</span>
                </div>
                <div className="data-row">
                  <span>Agendar novo check-in visual</span>
                  <span className="text-muted">Em 2 dias</span>
                </div>
              </div>
            </article>
          </section>
        </div>

        <nav className="bottom-nav">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.label}
              className={`nav-item ${item.active ? "active" : ""}`}
              type="button"
            >
              <span className="nav-icon">{item.short}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

export default App;