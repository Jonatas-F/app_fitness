import { ROUTE_PATHS } from "../routes/routePaths";

export const navigationItems = [
  { label: "Dashboard", path: ROUTE_PATHS.dashboard, iconKey: "dashboard" },
  { label: "Treinos", path: ROUTE_PATHS.workouts, iconKey: "workouts" },
  { label: "Dietas", path: ROUTE_PATHS.diets, iconKey: "diet" },
  { label: "Check-ins", path: ROUTE_PATHS.checkins, iconKey: "checkin" },
  { label: "Personal Virtual", path: ROUTE_PATHS.chat, iconKey: "chat" },
  { label: "Configurações", path: ROUTE_PATHS.settings, iconKey: "settings" },
];

export const mobileNavigationItems = [
  { shortLabel: "Início",    path: ROUTE_PATHS.dashboard, iconKey: "dashboard" },
  { shortLabel: "Treinos",   path: ROUTE_PATHS.workouts,  iconKey: "workouts"  },
  { shortLabel: "Check-in",  path: ROUTE_PATHS.checkins,  iconKey: "checkin"   },
  { shortLabel: "Dietas",    path: ROUTE_PATHS.diets,     iconKey: "diet"      },
  { shortLabel: "Personal",  path: ROUTE_PATHS.chat,      iconKey: "chat"      },
  { shortLabel: "Ajustes",   path: ROUTE_PATHS.settings,  iconKey: "settings"  },
];

export const quickSummary = {
  title: "Resumo do plano",
  items: [
    "Objetivo ativo: recomposição corporal",
    "Treinos da semana: 5 sessões",
    "Próximo check-in: domingo",
  ],
};

const baseStats = [
  { label: "Plano ativo", value: "Em montagem", helper: "Pronto para conectar com Personal Virtual" },
  { label: "Check-ins", value: "Local", helper: "Histórico salvo no navegador" },
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
        description: "Quanto mais contexto o usuário entrega, melhor fica a personalização.",
        items: ["Check-in", "Histórico", "Objetivo", "Preferências"],
      },
      {
        title: "Próxima evolução",
        description: "Conectar backend, créditos por plano e geração de protocolos.",
        items: ["API de Personal Virtual", "Tokens", "Treino e dieta"],
      },
    ],
    asideTitle,
    asideItems,
    footerNote: "Dados demonstrativos até a integração com backend e Personal Virtual.",
  };
}

export const dashboardData = pageData({
  badge: "Dashboard",
  title: "Visão geral do Shape Certo",
  subtitle: "Acompanhe objetivo, check-ins, treino e dieta em um único painel.",
  primaryTitle: "Próxima ação recomendada",
  primaryDescription: "Complete o check-in inteligente para melhorar treino, dieta e comparações futuras.",
  primaryItems: [
    "Registrar peso, altura, sono, energia e aderência",
    "Adicionar bioimpedância quando estiver disponível",
    "Manter histórico para comparar evolução",
  ],
  asideTitle: quickSummary.title,
  asideItems: quickSummary.items,
});

export const workoutsViews = {
  list: pageData({
    badge: "Treinos",
    title: "Treinos personalizados",
    subtitle: "Protocolos preparados para evoluir a partir do objetivo, experiência e check-ins.",
    primaryTitle: "Treino atual",
    primaryDescription: "Nenhum treino gerado pela Personal Virtual ainda.",
    primaryItems: ["Complete o check-in", "Informe disponibilidade semanal", "Registre limitações físicas"],
    asideTitle: "Checklist",
    asideItems: ["Objetivo claro", "Dias disponíveis", "Lesões informadas"],
  }),
  history: pageData({
    badge: "Histórico",
    title: "Histórico de treinos",
    subtitle: "Consulte ciclos anteriores e acompanhe ajustes feitos ao longo do tempo.",
    primaryTitle: "Ciclos anteriores",
    primaryDescription: "Ainda não há ciclos de treino salvos.",
    primaryItems: ["Treino gerado", "Período executado", "Resultado do ciclo"],
    asideTitle: "Comparar",
    asideItems: ["Carga", "Volume", "Aderência"],
  }),
  generate: pageData({
    badge: "Gerar treino",
    title: "Gerar treino com Personal Virtual",
    subtitle: "Use o check-in como base para montar um protocolo coerente com a rotina.",
    primaryTitle: "Entrada necessária",
    primaryDescription: "A geração será mais precisa com check-in completo.",
    primaryItems: ["Objetivo", "Disponibilidade", "Experiência", "Limitações"],
    asideTitle: "Saída esperada",
    asideItems: ["Divisão semanal", "Exercícios", "Séries e repetições"],
  }),
  detail: pageData({
    badge: "Detalhe",
    title: "Detalhe do treino",
    subtitle: "Tela preparada para buscar um treino específico pelo id.",
    primaryTitle: "Treino selecionado",
    primaryDescription: "Detalhes reais entram quando houver backend.",
    primaryItems: ["Estrutura", "Exercícios", "Progresso"],
    asideTitle: "Notas",
    asideItems: ["Técnica", "Carga", "Recuperação"],
  }),
};

export const dietsViews = {
  list: pageData({
    badge: "Dietas",
    title: "Dietas personalizadas",
    subtitle: "Planos alimentares baseados no objetivo, bioimpedância e preferências.",
    primaryTitle: "Dieta atual",
    primaryDescription: "Nenhuma dieta gerada pela Personal Virtual ainda.",
    primaryItems: ["Complete o check-in", "Informe restrições", "Registre fome e aderência"],
    asideTitle: "Checklist",
    asideItems: ["Peso e altura", "Objetivo", "Restrições alimentares"],
  }),
  history: pageData({
    badge: "Histórico",
    title: "Histórico de dietas",
    subtitle: "Consulte dietas anteriores e os ajustes de cada ciclo.",
    primaryTitle: "Ciclos alimentares",
    primaryDescription: "Ainda não há dietas salvas.",
    primaryItems: ["Calorias", "Macros", "Resultado"],
    asideTitle: "Comparar",
    asideItems: ["Peso", "Aderência", "Fome"],
  }),
  generate: pageData({
    badge: "Gerar dieta",
    title: "Gerar dieta com Personal Virtual",
    subtitle: "Use o check-in para calcular uma dieta alinhada ao objetivo.",
    primaryTitle: "Entrada necessária",
    primaryDescription: "Bioimpedância e preferências melhoram a precisão.",
    primaryItems: ["Objetivo", "Peso e altura", "Restrições", "Refeições por dia"],
    asideTitle: "Saída esperada",
    asideItems: ["Calorias", "Macros", "Refeições"],
  }),
  detail: pageData({
    badge: "Detalhe",
    title: "Detalhe da dieta",
    subtitle: "Tela preparada para buscar uma dieta específica pelo id.",
    primaryTitle: "Dieta selecionada",
    primaryDescription: "Detalhes reais entram quando houver backend.",
    primaryItems: ["Macros", "Refeições", "Substituições"],
    asideTitle: "Notas",
    asideItems: ["Aderência", "Fome", "Ajustes"],
  }),
};

export const progressViews = {
  overview: pageData({
    badge: "Progresso",
    title: "Evolução do usuário",
    subtitle: "Compare check-ins, medidas, fotos e bioimpedância ao longo do tempo.",
    primaryTitle: "Linha do tempo",
    primaryDescription: "Os check-ins salvos serão a base das comparações.",
    primaryItems: ["Peso", "Medidas", "Bioimpedância", "Fotos"],
    asideTitle: "Indicadores",
    asideItems: ["Composição corporal", "Aderência", "Performance"],
  }),
  photos: pageData({
    badge: "Fotos",
    title: "Fotos de progresso",
    subtitle: "Organize registros visuais para comparação.",
    primaryTitle: "Timeline de fotos",
    primaryDescription: "Fotos serão conectadas ao check-in correspondente.",
    primaryItems: ["Frontal", "Lateral", "Costas"],
    asideTitle: "Padrao",
    asideItems: ["Mesmo local", "Mesma luz", "Mesma distância"],
  }),
  compare: pageData({
    badge: "Comparar",
    title: "Comparação de progresso",
    subtitle: "Compare dois check-ins para visualizar evolução.",
    primaryTitle: "Comparativo",
    primaryDescription: "Selecione registros quando houver histórico suficiente.",
    primaryItems: ["Check-in inicial", "Check-in atual", "Diferencas"],
    asideTitle: "Leitura",
    asideItems: ["Peso", "Medidas", "Fotos"],
  }),
  bio: pageData({
    badge: "Bioimpedância",
    title: "Histórico de bioimpedância",
    subtitle: "Acompanhe composição corporal e qualidade dos dados para Personal Virtual.",
    primaryTitle: "Dados corporais",
    primaryDescription: "Registre gordura, massa magra e medidas no check-in.",
    primaryItems: ["Gordura corporal", "Massa magra", "Gordura visceral"],
    asideTitle: "Uso pela Personal Virtual",
    asideItems: ["Calorias", "Macros", "Volume de treino"],
  }),
  measurements: pageData({
    badge: "Medidas",
    title: "Histórico de medidas",
    subtitle: "Acompanhe cintura, abdômen, quadril e outras medidas.",
    primaryTitle: "Medidas principais",
    primaryDescription: "As medidas ajudam a validar evolução além do peso.",
    primaryItems: ["Cintura", "Abdomen", "Quadril"],
    asideTitle: "Comparar",
    asideItems: ["Inicio", "Atual", "Meta"],
  }),
};

export const profileViews = {
  view: pageData({
    badge: "Perfil",
    title: "Perfil do usuário",
    subtitle: "Dados pessoais e preferências que apoiam check-ins e geração por Personal Virtual.",
    primaryTitle: "Cadastro",
    primaryDescription: "Informações do perfil serão combinadas com check-ins.",
    primaryItems: ["Dados pessoais", "Objetivo", "Preferências"],
    asideTitle: "Privacidade",
    asideItems: ["Dados locais", "Histórico do usuário", "Controle de edição"],
  }),
  edit: pageData({
    badge: "Editar perfil",
    title: "Editar perfil",
    subtitle: "Atualize dados permanentes do usuário.",
    primaryTitle: "Informações editáveis",
    primaryDescription: "Dados reais entram quando houver backend.",
    primaryItems: ["Nome", "Objetivo", "Preferências"],
    asideTitle: "Dica",
    asideItems: ["Mantenha dados consistentes", "Use check-ins para progresso"],
  }),
};

export const chatData = pageData({
  badge: "Personal Virtual",
  title: "Assistente inteligente",
  subtitle: "Canal futuro para consultar treino, dieta e progresso com base nos check-ins.",
  primaryTitle: "Contexto disponivel",
  primaryDescription: "A Personal Virtual deve consumir tokens conforme o plano do usuário.",
  primaryItems: ["Check-ins", "Treinos", "Dietas", "Perfil"],
  asideTitle: "Uso futuro",
  asideItems: ["Tokens por plano", "Histórico de perguntas", "Respostas personalizadas"],
});

export const settingsData = pageData({
  badge: "Configurações",
  title: "Configurações do app",
  subtitle: "Preferências, plano, tokens e integrações futuras.",
  primaryTitle: "Plano e créditos",
  primaryDescription: "Área preparada para controlar acesso e consumo de Personal Virtual.",
  primaryItems: ["Plano ativo", "Tokens disponíveis", "Histórico de consumo"],
  asideTitle: "Sistema",
  asideItems: ["Conta", "Notificações", "Privacidade"],
});
