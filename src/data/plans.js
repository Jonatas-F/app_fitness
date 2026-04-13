export const subscriptionPlans = [
  {
    id: "basico",
    name: "Basico",
    monthlyPrice: 39,
    tokens: "25.000 tokens",
    workouts: "1 treino mensal",
    meals: "1 dieta mensal",
    highlight: "Para comecar com direcao",
    features: [
      "Check-in mensal completo",
      "Dashboard de peso e medidas",
      "Treino personalizado mensal",
      "Dieta personalizada mensal",
      "Historico essencial de evolucao",
    ],
  },
  {
    id: "intermediario",
    name: "Intermediario",
    monthlyPrice: 79,
    tokens: "90.000 tokens",
    workouts: "4 ajustes de treino",
    meals: "4 ajustes de dieta",
    highlight: "Mais acompanhamento na rotina",
    featured: true,
    features: [
      "Check-ins diario, semanal e mensal",
      "Analise de bioimpedancia e medidas",
      "Academia do usuario e preferencias alimentares",
      "Feedback tecnico por video",
      "Comparativos semanais no dashboard",
    ],
  },
  {
    id: "avancado",
    name: "Avancado",
    monthlyPrice: 149,
    tokens: "250.000 tokens",
    workouts: "Treinos ilimitados por protocolo",
    meals: "Dietas e substituicoes completas",
    highlight: "Acesso total a plataforma",
    features: [
      "Todos os recursos do intermediario",
      "Regeracao de protocolos com maior frequencia",
      "Analise completa de fotos, video e performance",
      "Relatorios avancados de carga, sono e aderencia",
      "Prioridade para novas funcoes do Personal Virtual",
    ],
  },
];

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getPlanById(planId) {
  return subscriptionPlans.find((plan) => plan.id === planId) || subscriptionPlans[1];
}

export function getAnnualPrice(plan) {
  return plan.monthlyPrice * 12 * 0.8;
}
