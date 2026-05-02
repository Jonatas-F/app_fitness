/**
 * Planos de assinatura do Shape Certo.
 *
 * Precos calculados com margem bruta de ~90% sobre custo real
 * (GPT-4o-mini + infra + Stripe), conforme modelo financeiro em:
 *   src/data/shape_certo_business_plan.xlsx
 *
 * Ultima revisao: Mai 2026  |  Cambio ref.: USD 1 = BRL 5.70
 */
export const subscriptionPlans = [
  {
    id: "basico",
    name: "Basico",
    /** Preco mensal em BRL */
    monthlyPrice: 29.90,
    /** Preco anual em BRL (20% de desconto vs. 12x mensal) */
    annualPrice: 287.04,
    tokens: "~260.000 tokens/mes",
    workouts: "2-4 geracoes de treino/mes",
    meals: "2-4 geracoes de dieta/mes",
    highlight: "Para comecar com direcao",
    features: [
      "Check-in semanal (peso, altura, saciedade, sono, treino)",
      "Ate 2 fotos de progresso por check-in",
      "Geracao de dieta IA com base no perfil basico",
      "Geracao de treino IA com base no perfil basico",
      "Chat com Personal Virtual IA",
      "Dashboard basico (resumo e feedback)",
    ],
  },
  {
    id: "intermediario",
    name: "Intermediario",
    monthlyPrice: 59.90,
    annualPrice: 575.04,
    tokens: "~1.500.000 tokens/mes",
    workouts: "4-6 geracoes/ajustes de treino",
    meals: "4-6 geracoes/ajustes de dieta",
    highlight: "Mais acompanhamento na rotina",
    featured: true,
    features: [
      "Check-in semanal e mensal completo",
      "Medidas corporais completas (cintura, quadril, braco, etc.)",
      "Bioimpedancia (InBody, Tanita ou similar)",
      "Ate 5 fotos de progresso por check-in",
      "Geracao de dieta e treino IA com historico de 3 meses",
      "Chat com contexto expandido",
      "Dashboard completo (corpo, cargas, mensal, feedback)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 99.90,
    annualPrice: 959.04,
    tokens: "~4.500.000 tokens/mes",
    workouts: "Geracoes ilimitadas por protocolo",
    meals: "Dietas e substituicoes completas",
    highlight: "Acesso total a plataforma",
    features: [
      "Todos os check-ins (diario, semanal, mensal)",
      "Fotos de progresso ilimitadas",
      "Medidas corporais + bioimpedancia completa",
      "IA com contexto total e historico completo",
      "Chat com historico completo sem limite",
      "Dashboard premium com todos os insights",
      "Upload de videos de exercicios",
      "Todas as funcionalidades do app",
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
  return plan.annualPrice ?? plan.monthlyPrice * 12 * 0.8;
}
