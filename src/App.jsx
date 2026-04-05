import { useState } from "react";

const navItems = [
  { label: "Dashboard", short: "DB" },
  { label: "Treinos", short: "TR" },
  { label: "Dieta", short: "DI" },
  { label: "Progresso", short: "PR" },
  { label: "Check-ins", short: "CK" },
  { label: "Chat IA", short: "IA" },
  { label: "Perfil", short: "PF" },
];

const pageContent = {
  Dashboard: {
    title: "Dashboard",
    subtitle: "Seu centro de controle fitness com IA",
    heroEyebrow: "Plano inteligente em andamento",
    heroTitle:
      "Evolua com treinos, dieta e ajustes automáticos baseados no seu progresso.",
    heroDescription:
      "Acompanhe sua rotina em um painel moderno e visual. Aqui você enxerga seu objetivo atual, seus números, recomendações da IA e as próximas ações que mais influenciam o seu resultado.",
    primaryAction: "Ver treino de hoje",
    secondaryAction: "Revisar dieta atual",
    metrics: [
      { label: "Peso atual", value: "84,6 kg", trend: "-1,4 kg nas últimas 3 semanas" },
      { label: "Meta principal", value: "Hipertrofia", trend: "Foco em massa magra com ajuste progressivo" },
      { label: "Aderência", value: "87%", trend: "Constância excelente nos últimos 7 dias" },
      { label: "Próximo check-in", value: "2 dias", trend: "Atualização corporal recomendada" },
    ],
    cards: [
      {
        title: "Treino de hoje",
        subtitle: "Peito, ombro e tríceps",
        badge: "Treino atual",
        items: ["Supino reto — 4x10", "Desenvolvimento — 4x12", "Tríceps corda — 3x15"],
      },
      {
        title: "Dieta do dia",
        subtitle: "2.450 kcal planejadas",
        badge: "Plano alimentar",
        items: ["Proteína: 180g", "Carboidrato: 250g", "Gordura: 70g"],
      },
      {
        title: "Evolução",
        subtitle: "Resumo da semana",
        badge: "Análise IA",
        items: ["Sono médio: 7h12", "Energia: alta", "Desempenho: em crescimento"],
      },
    ],
    bottomSections: [
      {
        title: "Resumo semanal",
        subtitle: "Visão rápida do que mais impactou sua evolução.",
        badge: "IA",
        badgeClass: "badge-warning",
        items: [
          "Sua consistência está acima da média das últimas semanas.",
          "A IA sugere manter a progressão de carga nos exercícios principais.",
          "Seu consumo de água ficou abaixo da meta ideal em 2 dos últimos 5 dias.",
          "Novo check-in com foto pode melhorar a precisão dos ajustes.",
        ],
      },
      {
        title: "Próximas ações",
        subtitle: "Pequenos passos para manter sua rotina forte.",
        badge: "Hoje",
        badgeClass: "badge-success",
        items: [
          "Concluir treino A até 20h",
          "Registrar ingestão de água",
          "Confirmar refeição pós-treino",
          "Agendar novo check-in visual",
        ],
      },
    ],
  },

  Treinos: {
    title: "Treinos",
    subtitle: "Planejamento semanal, divisão e execução",
    heroEyebrow: "Treino personalizado",
    heroTitle: "Treinos adaptados ao seu objetivo, rotina e desempenho recente.",
    heroDescription:
      "Consulte sua divisão semanal, acompanhe exercícios, séries e foco muscular, e use a IA para ajustar intensidade, volume e limitações físicas.",
    primaryAction: "Gerar novo treino",
    secondaryAction: "Ver histórico",
    metrics: [
      { label: "Treinos na semana", value: "5", trend: "Meta semanal configurada" },
      { label: "Treino atual", value: "A", trend: "Peito, ombro e tríceps" },
      { label: "Volume", value: "Médio/alto", trend: "Compatível com hipertrofia" },
      { label: "Execução", value: "91%", trend: "Últimos 14 dias" },
    ],
    cards: [
      {
        title: "Divisão semanal",
        subtitle: "Estrutura atual",
        badge: "Plano",
        items: ["A — Peito, ombro e tríceps", "B — Costas e bíceps", "C — Pernas completas"],
      },
      {
        title: "Sugestão da IA",
        subtitle: "Ajuste recomendado",
        badge: "IA",
        items: ["Aumentar carga no supino reto", "Manter cadência no agachamento", "Adicionar mais 1 série em ombros"],
      },
      {
        title: "Atenção técnica",
        subtitle: "Pontos de melhoria",
        badge: "Foco",
        items: ["Controlar intervalo entre séries", "Evitar compensação lombar", "Registrar percepção de esforço"],
      },
    ],
    bottomSections: [
      {
        title: "Próximo treino",
        subtitle: "Organize sua próxima sessão.",
        badge: "Amanhã",
        badgeClass: "badge-primary",
        items: ["Treino B programado", "Duração estimada: 55 min", "Carga sugerida com progressão de 2,5%"],
      },
      {
        title: "Histórico recente",
        subtitle: "Últimas execuções",
        badge: "3 sessões",
        badgeClass: "badge-success",
        items: ["Treino A concluído", "Treino B concluído", "Treino C concluído"],
      },
    ],
  },

  Dieta: {
    title: "Dieta",
    subtitle: "Plano alimentar com ajustes inteligentes",
    heroEyebrow: "Nutrição orientada por IA",
    heroTitle: "Organize suas refeições com foco no seu objetivo e aderência real.",
    heroDescription:
      "A dieta acompanha seu contexto: calorias, macros, preferências, substituições e constância. A IA pode sugerir mudanças conforme seu progresso e sua rotina.",
    primaryAction: "Gerar ajuste alimentar",
    secondaryAction: "Ver refeições",
    metrics: [
      { label: "Calorias", value: "2.450", trend: "Meta diária atual" },
      { label: "Proteína", value: "180g", trend: "Distribuição adequada ao objetivo" },
      { label: "Água", value: "2,6L", trend: "Meta ideal: 3,2L" },
      { label: "Aderência", value: "83%", trend: "Últimos 7 dias" },
    ],
    cards: [
      {
        title: "Refeições principais",
        subtitle: "Plano do dia",
        badge: "Hoje",
        items: ["Café da manhã proteico", "Almoço com carbo complexo", "Jantar com foco em recuperação"],
      },
      {
        title: "Substituições",
        subtitle: "Flexibilidade do plano",
        badge: "Opções",
        items: ["Frango ↔ patinho", "Arroz ↔ batata inglesa", "Iogurte ↔ whey + fruta"],
      },
      {
        title: "Análise da IA",
        subtitle: "Comportamento alimentar",
        badge: "IA",
        items: ["Boa regularidade no almoço", "Baixa ingestão hídrica em dias corridos", "Pós-treino pode ser otimizado"],
      },
    ],
    bottomSections: [
      {
        title: "Alertas do plano",
        subtitle: "O que merece atenção hoje.",
        badge: "Monitorar",
        badgeClass: "badge-warning",
        items: ["Aumentar ingestão de água", "Não pular refeição pós-treino", "Evitar excesso de gordura no jantar"],
      },
      {
        title: "Próximo ajuste",
        subtitle: "Quando a IA deve revisar sua dieta.",
        badge: "Em breve",
        badgeClass: "badge-success",
        items: ["Novo check-in libera ajuste calórico", "Peso atual influencia macros", "Sono também impacta recomendação"],
      },
    ],
  },

  Progresso: {
    title: "Progresso",
    subtitle: "Acompanhe sua evolução corporal",
    heroEyebrow: "Histórico de evolução",
    heroTitle: "Visualize seu progresso com dados, fotos e comparações ao longo do tempo.",
    heroDescription:
      "Use esta área para acompanhar peso, gordura corporal, massa magra, medidas, fotos e histórico de bioimpedância em uma visão clara e motivadora.",
    primaryAction: "Registrar nova medida",
    secondaryAction: "Comparar fotos",
    metrics: [
      { label: "Peso", value: "-1,4 kg", trend: "Últimas 3 semanas" },
      { label: "Gordura", value: "-2,1%", trend: "Tendência de queda" },
      { label: "Massa magra", value: "+0,8 kg", trend: "Evolução positiva" },
      { label: "Check-ins", value: "12", trend: "Histórico disponível" },
    ],
    cards: [
      {
        title: "Linha do tempo",
        subtitle: "Marcos recentes",
        badge: "Histórico",
        items: ["Entrada de peso atualizada", "Nova foto frontal enviada", "Bioimpedância mais recente processada"],
      },
      {
        title: "Comparação",
        subtitle: "Antes vs depois",
        badge: "Visual",
        items: ["Melhora na definição abdominal", "Redução de cintura", "Maior volume em membros superiores"],
      },
      {
        title: "Leitura da IA",
        subtitle: "Interpretação automática",
        badge: "IA",
        items: ["Progresso consistente", "Resposta positiva ao plano atual", "Momento favorável para novo ajuste"],
      },
    ],
    bottomSections: [
      {
        title: "Métricas em destaque",
        subtitle: "O que mais mudou.",
        badge: "Resumo",
        badgeClass: "badge-primary",
        items: ["Circunferência abdominal em queda", "Peso estabilizando com melhor composição", "Fotos mostram evolução perceptível"],
      },
      {
        title: "Próxima coleta",
        subtitle: "Melhor momento para atualizar dados.",
        badge: "Sugestão",
        badgeClass: "badge-success",
        items: ["Repetir fotos em 7 dias", "Registrar peso ao acordar", "Atualizar medidas com mesma rotina"],
      },
    ],
  },

  "Check-ins": {
    title: "Check-ins",
    subtitle: "Atualizações rápidas da sua rotina",
    heroEyebrow: "Monitoramento contínuo",
    heroTitle: "Registre peso, energia, sono, aderência e observações com frequência.",
    heroDescription:
      "Os check-ins alimentam a inteligência do sistema e ajudam a IA a recalibrar treino, dieta e recomendações conforme sua realidade.",
    primaryAction: "Novo check-in",
    secondaryAction: "Ver histórico",
    metrics: [
      { label: "Último check-in", value: "2 dias", trend: "Dentro da frequência ideal" },
      { label: "Energia", value: "8/10", trend: "Boa percepção recente" },
      { label: "Sono", value: "7h12", trend: "Média semanal" },
      { label: "Aderência", value: "87%", trend: "Plano sendo seguido com constância" },
    ],
    cards: [
      {
        title: "Campos do check-in",
        subtitle: "O que você registra",
        badge: "Atualização",
        items: ["Peso", "Energia", "Sono", "Aderência", "Observações e foto opcional"],
      },
      {
        title: "Impacto no plano",
        subtitle: "Como a IA usa esses dados",
        badge: "IA",
        items: ["Ajuste de calorias", "Revisão de intensidade", "Recomendação de recuperação"],
      },
      {
        title: "Frequência ideal",
        subtitle: "Melhor prática",
        badge: "Rotina",
        items: ["2 a 3 vezes por semana", "Sempre em horário parecido", "Preferencialmente com observações"],
      },
    ],
    bottomSections: [
      {
        title: "Seu histórico recente",
        subtitle: "Últimos registros.",
        badge: "Recente",
        badgeClass: "badge-primary",
        items: ["Check-in com energia alta", "Check-in com leve cansaço muscular", "Check-in com foto enviada"],
      },
      {
        title: "Recomendação imediata",
        subtitle: "Próximo passo sugerido.",
        badge: "Hoje",
        badgeClass: "badge-success",
        items: ["Registrar novo peso", "Atualizar percepção de sono", "Anotar resposta do treino anterior"],
      },
    ],
  },

  "Chat IA": {
    title: "Chat IA",
    subtitle: "Converse com a inteligência do app",
    heroEyebrow: "Assistente inteligente",
    heroTitle: "Tire dúvidas, receba ajustes e mantenha seu plano sempre alinhado.",
    heroDescription:
      "O chat ajuda com treino, dieta, motivação, dúvidas do dia a dia e interpretação dos seus dados, tornando o acompanhamento mais próximo e acessível.",
    primaryAction: "Abrir conversa",
    secondaryAction: "Ver sugestões",
    metrics: [
      { label: "Mensagens recentes", value: "18", trend: "Interações desta semana" },
      { label: "Tema principal", value: "Ajuste de treino", trend: "Assunto mais frequente" },
      { label: "Recomendações", value: "6", trend: "Geradas com base no seu histórico" },
      { label: "Resposta média", value: "Instantânea", trend: "Assistência contínua" },
    ],
    cards: [
      {
        title: "O que você pode pedir",
        subtitle: "Exemplos práticos",
        badge: "Ajuda",
        items: ["Ajustar dieta", "Alterar treino por dor", "Montar rotina da semana"],
      },
      {
        title: "Base da resposta",
        subtitle: "Dados considerados",
        badge: "Inteligência",
        items: ["Objetivo atual", "Check-ins", "Histórico corporal", "Aderência recente"],
      },
      {
        title: "Sugestões rápidas",
        subtitle: "Prompts úteis",
        badge: "Atalhos",
        items: ["Como melhorar meu pós-treino?", "Posso trocar arroz por batata?", "Como ajustar meu treino hoje?"],
      },
    ],
    bottomSections: [
      {
        title: "Últimos insights",
        subtitle: "O que a IA destacaria agora.",
        badge: "IA",
        badgeClass: "badge-warning",
        items: ["Sono impactando recuperação", "Treino responde bem à progressão atual", "Hidratação ainda abaixo da meta"],
      },
      {
        title: "Próxima conversa útil",
        subtitle: "Sugestão para hoje.",
        badge: "Recomendado",
        badgeClass: "badge-success",
        items: ["Pedir análise do treino de hoje", "Solicitar revisão da dieta", "Perguntar sobre estratégia de fim de semana"],
      },
    ],
  },

  Perfil: {
    title: "Perfil",
    subtitle: "Seus dados, objetivo e preferências",
    heroEyebrow: "Configuração pessoal",
    heroTitle: "Mantenha seu perfil atualizado para receber planos cada vez mais precisos.",
    heroDescription:
      "Esta área reúne seus dados físicos, objetivo atual, preferências alimentares, limitações e informações essenciais para personalização da IA.",
    primaryAction: "Editar perfil",
    secondaryAction: "Ver preferências",
    metrics: [
      { label: "Objetivo", value: "Hipertrofia", trend: "Meta ativa no sistema" },
      { label: "Altura", value: "1,78 m", trend: "Dado cadastral" },
      { label: "Peso base", value: "86 kg", trend: "Peso de entrada" },
      { label: "Plano atual", value: "Personalizado", trend: "Gerado com IA" },
    ],
    cards: [
      {
        title: "Dados físicos",
        subtitle: "Base do plano",
        badge: "Perfil",
        items: ["Idade", "Altura", "Peso", "Sexo", "Histórico corporal"],
      },
      {
        title: "Preferências",
        subtitle: "Informações do dia a dia",
        badge: "Hábitos",
        items: ["Rotina semanal", "Alimentos preferidos", "Restrições", "Horários disponíveis"],
      },
      {
        title: "Saúde e limitações",
        subtitle: "Ajustes de segurança",
        badge: "Importante",
        items: ["Lesões", "Desconfortos", "Restrições médicas", "Limitações de movimento"],
      },
    ],
    bottomSections: [
      {
        title: "O que revisar",
        subtitle: "Campos estratégicos para atualizar.",
        badge: "Revisão",
        badgeClass: "badge-primary",
        items: ["Peso atual", "Objetivo principal", "Disponibilidade semanal", "Preferências alimentares"],
      },
      {
        title: "Benefício da atualização",
        subtitle: "Como isso melhora o app.",
        badge: "Precisão",
        badgeClass: "badge-success",
        items: ["Treino mais alinhado", "Dieta mais viável", "Recomendações mais úteis"],
      },
    ],
  },
};

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const currentPage = pageContent[activePage];

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
              className={`nav-item ${activePage === item.label ? "active" : ""}`}
              type="button"
              onClick={() => setActivePage(item.label)}
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

      <main className="page-content">
        <div className="page-container">
          <header className="topbar">
            <div className="brand">
              <div className="brand-text">
                <h1>{currentPage.title}</h1>
                <span>{currentPage.subtitle}</span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="secondary-button" type="button">
                {currentPage.secondaryAction}
              </button>
              <button className="primary-button" type="button">
                {currentPage.primaryAction}
              </button>
            </div>
          </header>

          <section className="hero-card">
            <span className="eyebrow">{currentPage.heroEyebrow}</span>

            <h2 className="hero-title">{currentPage.heroTitle}</h2>

            <p className="hero-description">{currentPage.heroDescription}</p>

            <div className="hero-actions">
              <button className="primary-button" type="button">
                {currentPage.primaryAction}
              </button>
              <button className="ghost-button" type="button">
                {currentPage.secondaryAction}
              </button>
            </div>
          </section>

          <section className="grid grid-4 mt-24">
            {currentPage.metrics.map((metric) => (
              <div key={metric.label} className="metric-card">
                <p className="metric-label">{metric.label}</p>
                <h3 className="metric-value">{metric.value}</h3>
                <p className="metric-trend">{metric.trend}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-3 mt-24">
            {currentPage.cards.map((card) => (
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
            {currentPage.bottomSections.map((section) => (
              <article key={section.title} className="glass-card card-padding">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{section.title}</h3>
                    <p className="card-subtitle">{section.subtitle}</p>
                  </div>
                  <span className={`badge ${section.badgeClass}`}>{section.badge}</span>
                </div>

                <div className="data-list">
                  {section.items.map((item) => (
                    <div key={item} className="data-row">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>

        <nav className="bottom-nav">
          {navItems.slice(0, 4).map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.label ? "active" : ""}`}
              type="button"
              onClick={() => setActivePage(item.label)}
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