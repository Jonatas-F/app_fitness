/**
 * Planos de assinatura do Shape Certo.
 *
 * Precos calculados com margem bruta de ~90% sobre custo real
 * (GPT-4o-mini + infra + Stripe), conforme modelo financeiro em:
 *   src/data/shape_certo_business_plan.xlsx
 *
 * Ultima revisao: Mai 2026  |  Cambio ref.: USD 1 = BRL 5.70
 */

/**
 * Matriz completa de funcionalidades por plano.
 *
 * Cada item pode ser:
 *  - boolean: { name, category, plans: string[] }
 *    → ✓ para planos listados, ✗ para os demais
 *  - valor:   { name, category, plans: { basico, intermediario, pro } }
 *    → mostra o texto correspondente para cada plano (ex: "2", "Ate 6", "Ilimitadas")
 */
export const featureMatrix = [
  // ── Check-ins ────────────────────────────────────────────────
  {
    name: "Check-in semanal",
    category: "Check-ins",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Check-in mensal completo",
    category: "Check-ins",
    plans: ["intermediario", "pro"],
  },
  {
    name: "Check-in diario de sinais",
    category: "Check-ins",
    plans: ["pro"],
  },

  // ── Fotos ────────────────────────────────────────────────────
  {
    name: "Fotos de progresso por check-in",
    category: "Fotos",
    plans: { basico: "2", intermediario: "Ate 6", pro: "Ilimitadas" },
  },

  // ── Medidas ──────────────────────────────────────────────────
  {
    name: "Medidas corporais completas",
    category: "Medidas",
    plans: ["intermediario", "pro"],
  },
  {
    name: "Dados de bioimpedancia",
    category: "Medidas",
    plans: ["intermediario", "pro"],
  },

  // ── Inteligencia Artificial ──────────────────────────────────
  {
    name: "Geracao de treino com IA",
    category: "IA",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Geracao de dieta com IA",
    category: "IA",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Contexto da IA",
    category: "IA",
    plans: { basico: "Basico", intermediario: "Historico 3 meses", pro: "Total" },
  },
  {
    name: "Upload de videos de exercicios",
    category: "IA",
    plans: ["intermediario", "pro"],
  },

  // ── Chat ─────────────────────────────────────────────────────
  {
    name: "Chat com Personal Virtual IA",
    category: "Chat",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Historico de conversas",
    category: "Chat",
    plans: { basico: "Sessao atual", intermediario: "Expandido", pro: "Completo" },
  },

  // ── Dashboard ────────────────────────────────────────────────
  {
    name: "Dashboard resumo e feedback",
    category: "Dashboard",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Dashboard avancado (corpo, cargas, mensal)",
    category: "Dashboard",
    plans: ["intermediario", "pro"],
  },

  // ── Tokens ───────────────────────────────────────────────────
  {
    name: "Tokens de IA por mes",
    category: "Tokens",
    plans: { basico: "~260k", intermediario: "~1,5M", pro: "~4,5M" },
  },
];

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
    /**
     * Destaques exibidos no cartao do plano.
     * Mostra o que este plano entrega — sem herdar dos anteriores.
     */
    highlights: [
      { name: "Check-in semanal (peso, sinais, aderencia)", isIncluded: true },
      { name: "2 fotos de progresso por check-in", isIncluded: true },
      { name: "Geracao de treino com IA", isIncluded: true },
      { name: "Geracao de dieta com IA", isIncluded: true },
      { name: "Chat com Personal Virtual IA", isIncluded: true },
      { name: "Dashboard basico (resumo e feedback)", isIncluded: true },
    ],
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
    /**
     * Destaques: mostra o que este plano adiciona em relacao ao Basico.
     */
    highlights: [
      { name: "Tudo do plano Basico, e mais:", isIncluded: true },
      { name: "Check-in mensal completo", isIncluded: true },
      { name: "Medidas corporais completas + bioimpedancia", isIncluded: true },
      { name: "Ate 6 fotos por check-in", isIncluded: true },
      { name: "IA com historico de 3 meses", isIncluded: true },
      { name: "Dashboard completo (corpo, cargas, mensal)", isIncluded: true },
    ],
    features: [
      "Check-in semanal e mensal completo",
      "Medidas corporais completas (cintura, quadril, braco, etc.)",
      "Bioimpedancia (InBody, Tanita ou similar)",
      "Ate 6 fotos de progresso por check-in",
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
    /**
     * Destaques: mostra o que este plano adiciona em relacao ao Intermediario.
     */
    highlights: [
      { name: "Tudo do plano Intermediario, e mais:", isIncluded: true },
      { name: "Check-in diario de sinais", isIncluded: true },
      { name: "Fotos ilimitadas por check-in", isIncluded: true },
      { name: "IA com contexto total e historico completo", isIncluded: true },
      { name: "Upload de videos de exercicios", isIncluded: true },
      { name: "~4,5M tokens de IA por mes", isIncluded: true },
    ],
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
