import { ROUTE_PATHS } from "../routes/routePaths";

export const navigationItems = [
  { label: "Dashboard", path: ROUTE_PATHS.dashboard, iconKey: "dashboard" },
  { label: "Treinos", path: ROUTE_PATHS.workouts, iconKey: "workouts" },
  { label: "Dietas", path: ROUTE_PATHS.diets, iconKey: "diet" },
  { label: "Check-ins", path: ROUTE_PATHS.checkins, iconKey: "checkin" },
  { label: "Personal Virtual", path: ROUTE_PATHS.chat, iconKey: "chat" },
  { label: "Configuracoes", path: ROUTE_PATHS.settings, iconKey: "settings" },
];

export const mobileNavigationItems = [
  { shortLabel: "Inicio", path: ROUTE_PATHS.dashboard, iconKey: "dashboard" },
  { shortLabel: "Treinos", path: ROUTE_PATHS.workouts, iconKey: "workouts" },
  { shortLabel: "Dietas", path: ROUTE_PATHS.diets, iconKey: "diet" },
  { shortLabel: "Ajustes", path: ROUTE_PATHS.settings, iconKey: "settings" },
];

export const quickSummary = {
  title: "Resumo do plano",
  items: [
    "Objetivo ativo: recomposicao corporal",
    "Treinos da semana: 5 sessoes",
    "Proximo check-in: domingo",
  ],
};

const baseStats = [
  { label: "Plano ativo", value: "Em montagem", helper: "Pronto para conectar com Personal Virtual" },
  { label: "Check-ins", value: "Local", helper: "Historico salvo no navegador" },
  { label: "Treino", value: "Pendente", helper: "Gerado a partir dos dados" },
  { label: "Dieta", value: "Pendente", helper: "Baseada no objetivo atual" },
];

function pageData({ badge, title, subtitle, primaryTitle, primaryDescription, primaryItems, asideTitle, asideItems }) {
  return {
    badge,
    title,
    subtitle,
    stats: baseStats,
    primaryCard: {
      title: primaryTitle,
      description: primaryDescription,
      items: primaryItems,
    },
    secondaryCards: [
      {
        title: "Dados que alimentam a Personal Virtual",
        description: "Quanto mais contexto o usuario entrega, melhor fica a personalizacao.",
        items: ["Check-in", "Historico", "Objetivo", "Preferencias"],
      },
      {
        title: "Proxima evolucao",
        description: "Conectar backend, creditos por plano e geracao de protocolos.",
        items: ["API de Personal Virtual", "Tokens", "Treino e dieta"],
      },
    ],
    asideTitle,
    asideItems,
    footerNote: "Dados demonstrativos ate a integracao com backend e Personal Virtual.",
  };
}

export const dashboardData = pageData({
  badge: "Dashboard",
  title: "Visao geral do Shape Certo",
  subtitle: "Acompanhe objetivo, check-ins, treino e dieta em um unico painel.",
  primaryTitle: "Proxima acao recomendada",
  primaryDescription: "Complete o check-in inteligente para melhorar treino, dieta e comparacoes futuras.",
  primaryItems: [
    "Registrar peso, altura, sono, energia e aderencia",
    "Adicionar bioimpedancia quando estiver disponivel",
    "Manter historico para comparar evolucao",
  ],
  asideTitle: quickSummary.title,
  asideItems: quickSummary.items,
});

export const workoutsViews = {
  list: pageData({
    badge: "Treinos",
    title: "Treinos personalizados",
    subtitle: "Protocolos preparados para evoluir a partir do objetivo, experiencia e check-ins.",
    primaryTitle: "Treino atual",
    primaryDescription: "Nenhum treino gerado pela Personal Virtual ainda.",
    primaryItems: ["Complete o check-in", "Informe disponibilidade semanal", "Registre limitacoes fisicas"],
    asideTitle: "Checklist",
    asideItems: ["Objetivo claro", "Dias disponiveis", "Lesoes informadas"],
  }),
  history: pageData({
    badge: "Historico",
    title: "Historico de treinos",
    subtitle: "Consulte ciclos anteriores e acompanhe ajustes feitos ao longo do tempo.",
    primaryTitle: "Ciclos anteriores",
    primaryDescription: "Ainda nao ha ciclos de treino salvos.",
    primaryItems: ["Treino gerado", "Periodo executado", "Resultado do ciclo"],
    asideTitle: "Comparar",
    asideItems: ["Carga", "Volume", "Aderencia"],
  }),
  generate: pageData({
    badge: "Gerar treino",
    title: "Gerar treino com Personal Virtual",
    subtitle: "Use o check-in como base para montar um protocolo coerente com a rotina.",
    primaryTitle: "Entrada necessaria",
    primaryDescription: "A geracao sera mais precisa com check-in completo.",
    primaryItems: ["Objetivo", "Disponibilidade", "Experiencia", "Limitacoes"],
    asideTitle: "Saida esperada",
    asideItems: ["Divisao semanal", "Exercicios", "Series e repeticoes"],
  }),
  detail: pageData({
    badge: "Detalhe",
    title: "Detalhe do treino",
    subtitle: "Tela preparada para buscar um treino especifico pelo id.",
    primaryTitle: "Treino selecionado",
    primaryDescription: "Detalhes reais entram quando houver backend.",
    primaryItems: ["Estrutura", "Exercicios", "Progresso"],
    asideTitle: "Notas",
    asideItems: ["Tecnica", "Carga", "Recuperacao"],
  }),
};

export const dietsViews = {
  list: pageData({
    badge: "Dietas",
    title: "Dietas personalizadas",
    subtitle: "Planos alimentares baseados no objetivo, bioimpedancia e preferencias.",
    primaryTitle: "Dieta atual",
    primaryDescription: "Nenhuma dieta gerada pela Personal Virtual ainda.",
    primaryItems: ["Complete o check-in", "Informe restricoes", "Registre fome e aderencia"],
    asideTitle: "Checklist",
    asideItems: ["Peso e altura", "Objetivo", "Restricoes alimentares"],
  }),
  history: pageData({
    badge: "Historico",
    title: "Historico de dietas",
    subtitle: "Consulte dietas anteriores e os ajustes de cada ciclo.",
    primaryTitle: "Ciclos alimentares",
    primaryDescription: "Ainda nao ha dietas salvas.",
    primaryItems: ["Calorias", "Macros", "Resultado"],
    asideTitle: "Comparar",
    asideItems: ["Peso", "Aderencia", "Fome"],
  }),
  generate: pageData({
    badge: "Gerar dieta",
    title: "Gerar dieta com Personal Virtual",
    subtitle: "Use o check-in para calcular uma dieta alinhada ao objetivo.",
    primaryTitle: "Entrada necessaria",
    primaryDescription: "Bioimpedancia e preferencias melhoram a precisao.",
    primaryItems: ["Objetivo", "Peso e altura", "Restricoes", "Refeicoes por dia"],
    asideTitle: "Saida esperada",
    asideItems: ["Calorias", "Macros", "Refeicoes"],
  }),
  detail: pageData({
    badge: "Detalhe",
    title: "Detalhe da dieta",
    subtitle: "Tela preparada para buscar uma dieta especifica pelo id.",
    primaryTitle: "Dieta selecionada",
    primaryDescription: "Detalhes reais entram quando houver backend.",
    primaryItems: ["Macros", "Refeicoes", "Substituicoes"],
    asideTitle: "Notas",
    asideItems: ["Aderencia", "Fome", "Ajustes"],
  }),
};

export const progressViews = {
  overview: pageData({
    badge: "Progresso",
    title: "Evolucao do usuario",
    subtitle: "Compare check-ins, medidas, fotos e bioimpedancia ao longo do tempo.",
    primaryTitle: "Linha do tempo",
    primaryDescription: "Os check-ins salvos serao a base das comparacoes.",
    primaryItems: ["Peso", "Medidas", "Bioimpedancia", "Fotos"],
    asideTitle: "Indicadores",
    asideItems: ["Composicao corporal", "Aderencia", "Performance"],
  }),
  photos: pageData({
    badge: "Fotos",
    title: "Fotos de progresso",
    subtitle: "Organize registros visuais para comparacao.",
    primaryTitle: "Timeline de fotos",
    primaryDescription: "Fotos serao conectadas ao check-in correspondente.",
    primaryItems: ["Frontal", "Lateral", "Costas"],
    asideTitle: "Padrao",
    asideItems: ["Mesmo local", "Mesma luz", "Mesma distancia"],
  }),
  compare: pageData({
    badge: "Comparar",
    title: "Comparacao de progresso",
    subtitle: "Compare dois check-ins para visualizar evolucao.",
    primaryTitle: "Comparativo",
    primaryDescription: "Selecione registros quando houver historico suficiente.",
    primaryItems: ["Check-in inicial", "Check-in atual", "Diferencas"],
    asideTitle: "Leitura",
    asideItems: ["Peso", "Medidas", "Fotos"],
  }),
  bio: pageData({
    badge: "Bioimpedancia",
    title: "Historico de bioimpedancia",
    subtitle: "Acompanhe composicao corporal e qualidade dos dados para Personal Virtual.",
    primaryTitle: "Dados corporais",
    primaryDescription: "Registre gordura, massa magra e medidas no check-in.",
    primaryItems: ["Gordura corporal", "Massa magra", "Gordura visceral"],
    asideTitle: "Uso pela Personal Virtual",
    asideItems: ["Calorias", "Macros", "Volume de treino"],
  }),
  measurements: pageData({
    badge: "Medidas",
    title: "Historico de medidas",
    subtitle: "Acompanhe cintura, abdomen, quadril e outras medidas.",
    primaryTitle: "Medidas principais",
    primaryDescription: "As medidas ajudam a validar evolucao alem do peso.",
    primaryItems: ["Cintura", "Abdomen", "Quadril"],
    asideTitle: "Comparar",
    asideItems: ["Inicio", "Atual", "Meta"],
  }),
};

export const profileViews = {
  view: pageData({
    badge: "Perfil",
    title: "Perfil do usuario",
    subtitle: "Dados pessoais e preferencias que apoiam check-ins e geracao por Personal Virtual.",
    primaryTitle: "Cadastro",
    primaryDescription: "Informacoes do perfil serao combinadas com check-ins.",
    primaryItems: ["Dados pessoais", "Objetivo", "Preferencias"],
    asideTitle: "Privacidade",
    asideItems: ["Dados locais", "Historico do usuario", "Controle de edicao"],
  }),
  edit: pageData({
    badge: "Editar perfil",
    title: "Editar perfil",
    subtitle: "Atualize dados permanentes do usuario.",
    primaryTitle: "Informacoes editaveis",
    primaryDescription: "Dados reais entram quando houver backend.",
    primaryItems: ["Nome", "Objetivo", "Preferencias"],
    asideTitle: "Dica",
    asideItems: ["Mantenha dados consistentes", "Use check-ins para progresso"],
  }),
};

export const chatData = pageData({
  badge: "Personal Virtual",
  title: "Assistente inteligente",
  subtitle: "Canal futuro para consultar treino, dieta e progresso com base nos check-ins.",
  primaryTitle: "Contexto disponivel",
  primaryDescription: "A Personal Virtual deve consumir tokens conforme o plano do usuario.",
  primaryItems: ["Check-ins", "Treinos", "Dietas", "Perfil"],
  asideTitle: "Uso futuro",
  asideItems: ["Tokens por plano", "Historico de perguntas", "Respostas personalizadas"],
});

export const settingsData = pageData({
  badge: "Configuracoes",
  title: "Configuracoes do app",
  subtitle: "Preferencias, plano, tokens e integracoes futuras.",
  primaryTitle: "Plano e creditos",
  primaryDescription: "Area preparada para controlar acesso e consumo de Personal Virtual.",
  primaryItems: ["Plano ativo", "Tokens disponiveis", "Historico de consumo"],
  asideTitle: "Sistema",
  asideItems: ["Conta", "Notificacoes", "Privacidade"],
});
