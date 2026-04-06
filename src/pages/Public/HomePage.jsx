import { Link } from "react-router-dom";
import "./home.css";

const howItWorks = [
  {
    step: "01",
    title: "Você informa sua realidade atual",
    description:
      "Objetivo, condicionamento, rotina, dieta, evolução e dados físicos entram como base viva da plataforma.",
  },
  {
    step: "02",
    title: "O sistema organiza seu protocolo",
    description:
      "Treino, dieta, progresso e check-ins são estruturados para acompanhar sua jornada de forma prática e contínua.",
  },
  {
    step: "03",
    title: "A IA evolui junto com você",
    description:
      "Com o histórico salvo, a plataforma passa a recomendar ajustes com base em dados reais e não em achismo.",
  },
];

const plans = [
  {
    name: "Start",
    price: "R$ 29/mês",
    description: "Entrada ideal para validar rotina, metas e acompanhamento básico.",
    items: [
      "Dashboard inicial",
      "Perfil físico persistente",
      "Treino atual",
      "Dieta atual",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 59/mês",
    description: "Plano principal para quem quer acompanhar evolução e histórico.",
    items: [
      "Tudo do Start",
      "Histórico de protocolos",
      "Timeline de evolução",
      "Check-ins mensais",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    price: "R$ 89/mês",
    description: "Estrutura premium pronta para IA real atuar sobre treino, dieta e progresso.",
    items: [
      "Tudo do Pro",
      "Ajustes inteligentes",
      "Leitura de progresso",
      "Base pronta para automação mensal",
    ],
    highlight: false,
  },
];

function HomePage() {
  return (
    <div className="public-home">
      <header className="public-header">
        <Link to="/" className="brand public-brand">
          <div className="brand-badge">SC</div>
          <div className="brand-text">
            <h1>Shape Certo</h1>
            <span>Treino, dieta e evolução com base em dados</span>
          </div>
        </Link>

        <nav className="public-nav">
          <a href="#como-funciona">Como funciona</a>
          <a href="#quem-somos">Quem somos</a>
          <a href="#planos">Planos</a>
        </nav>

        <div className="public-header-actions">
          <Link to="/login" className="secondary-button">
            Entrar
          </Link>
          <Link to="/cadastro" className="primary-button">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="public-main">
        <section className="glass-card public-hero">
          <div className="public-hero-grid">
            <div>
              <span className="eyebrow">Plataforma fitness com IA</span>

              <h2 className="public-title">
                Seu treino, sua dieta e sua evolução organizados em um sistema
                inteligente, visual e contínuo.
              </h2>

              <p className="public-description">
                O Shape Certo foi pensado para funcionar como uma plataforma de
                acompanhamento físico baseada em dados reais, histórico de
                evolução e protocolos claros. A ideia é unir organização,
                motivação e inteligência para transformar constância em
                resultado.
              </p>

              <div className="public-action-group">
                <Link to="/cadastro" className="primary-button">
                  Começar cadastro
                </Link>
                <Link to="/login" className="secondary-button">
                  Já tenho conta
                </Link>
                <Link to="/app" className="ghost-button">
                  Ver área interna atual
                </Link>
              </div>

              <p className="public-note">
                Neste passo estamos fechando a entrada pública. As telas completas
                de login e cadastro entram no próximo passo.
              </p>
            </div>

            <aside className="glass-card public-mini-panel">
              <div>
                <span className="badge badge-primary">Proposta da plataforma</span>
                <h3>Um ecossistema para acompanhar transformação física</h3>
                <p>
                  Treino, dieta, progresso, check-ins e histórico integrados em
                  uma base viva para decisões cada vez mais inteligentes.
                </p>
              </div>

              <div className="public-mini-metrics">
                <div className="metric-card">
                  <span className="metric-label">Treino atual</span>
                  <strong className="metric-value">Protocolo ativo</strong>
                  <span className="metric-trend">Base pronta para IA real</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Evolução</span>
                  <strong className="metric-value">Histórico contínuo</strong>
                  <span className="metric-trend">Comparação por período</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="como-funciona" className="public-section">
          <div className="public-section-copy">
            <span className="eyebrow">Como funciona</span>
            <h2>Uma jornada simples por fora e inteligente por dentro</h2>
            <p>
              A experiência foi desenhada para ser clara para o usuário e forte
              em estrutura para o sistema crescer sem retrabalho.
            </p>
          </div>

          <div className="public-card-grid">
            {howItWorks.map((item) => (
              <article key={item.step} className="glass-card public-feature-card">
                <span className="public-feature-index">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="quem-somos" className="public-section">
          <div className="glass-card public-about-card">
            <div className="public-about-content">
              <div>
                <span className="eyebrow">Quem somos</span>
                <h2>
                  Uma proposta digital para transformar acompanhamento fitness em
                  algo acessível, organizado e evolutivo.
                </h2>
              </div>

              <div className="public-about-text">
                <p>
                  O Shape Certo nasce como uma plataforma que aproxima o usuário
                  de uma experiência parecida com personal trainer, nutricionista
                  e assistente de evolução, mas em formato digital, contínuo e
                  orientado por dados.
                </p>

                <p>
                  Em vez de depender apenas de percepção, a plataforma constrói
                  um histórico com perfil, protocolos, progresso e reavaliações,
                  preparando o terreno para uma IA realmente útil.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="planos" className="public-section">
          <div className="public-section-copy">
            <span className="eyebrow">Planos e valores</span>
            <h2>Estrutura comercial já preparada para evolução do produto</h2>
            <p>
              Os valores abaixo são ilustrativos para a base pública inicial e
              ajudam a validar a proposta comercial da plataforma.
            </p>
          </div>

          <div className="public-plans-grid">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`glass-card plan-card ${plan.highlight ? "plan-card-highlight" : ""}`}
              >
                <div className="plan-card-top">
                  <span className={`badge ${plan.highlight ? "badge-primary" : "badge-warning"}`}>
                    {plan.highlight ? "Plano principal" : "Plano disponível"}
                  </span>
                  <h3>{plan.name}</h3>
                  <div className="plan-price">{plan.price}</div>
                  <p>{plan.description}</p>
                </div>

                <ul className="plan-list">
                  {plan.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <Link to="/cadastro" className="primary-button plan-button">
                  Escolher {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="public-section">
          <div className="glass-card public-cta-panel">
            <div>
              <span className="eyebrow">Pronto para entrar</span>
              <h2>Agora a base pública já está definida para receber autenticação.</h2>
              <p>
                Neste ponto o projeto passa a ter uma entrada clara para visitantes
                e uma rota separada para a área interna já existente.
              </p>
            </div>

            <div className="public-action-group">
              <Link to="/cadastro" className="primary-button">
                Ir para cadastro
              </Link>
              <Link to="/login" className="secondary-button">
                Ir para login
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;