/**
 * Planos de assinatura do Shape Certo.
 *
 * Precos calculados com margem bruta de ~90% sobre custo real
 * (GPT-4o-mini + infra + Stripe), conforme modelo financeiro em:
 *   src/data/shape_certo_business_plan.xlsx
 *
 * Última revisão: Mai 2026  |  Câmbio ref.: USD 1 = BRL 5.70
 */

/**
 * Matriz completa de funcionalidades por plano.
 *
 * Cada item pode ser:
 *  - boolean: { name, category, plans: string[] }
 *    → ✓ para planos listados, ✗ para os demais
 *  - valor:   { name, category, plans: { basico, intermediario, pro } }
 *    → mostra o texto correspondente para cada plano (ex: "2", "Até 6", "Ilimitadas")
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
    name: "Check-in diário de sinais",
    category: "Check-ins",
    plans: ["pro"],
  },

  // ── Fotos ────────────────────────────────────────────────────
  {
    name: "Fotos de progresso",
    category: "Fotos",
    plans: ["intermediario", "pro"],
  },

  // ── Medidas ──────────────────────────────────────────────────
  {
    name: "Medidas corporais completas",
    category: "Medidas",
    plans: ["intermediario", "pro"],
  },
  {
    name: "Dados de bioimpedância",
    category: "Medidas",
    plans: ["intermediario", "pro"],
  },

  // ── Inteligência Artificial ──────────────────────────────────
  {
    name: "Geração de treino com IA",
    category: "IA",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Geração de dieta com IA",
    category: "IA",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Contexto da IA",
    category: "IA",
    plans: { basico: "Básico", intermediario: "Histórico 3 meses", pro: "Total" },
  },
  {
    name: "Upload de vídeos de exercícios",
    category: "IA",
    plans: ["pro"],
  },

  // ── Chat ─────────────────────────────────────────────────────
  {
    name: "Chat com Personal Virtual IA",
    category: "Chat",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Histórico de conversas",
    category: "Chat",
    plans: { basico: "1 sessão", intermediario: "3 meses", pro: "Ilimitado" },
  },

  // ── Dashboard ────────────────────────────────────────────────
  {
    name: "Dashboard resumo e feedback",
    category: "Dashboard",
    plans: ["basico", "intermediario", "pro"],
  },
  {
    name: "Dashboard avançado (corpo, cargas, mensal)",
    category: "Dashboard",
    plans: ["intermediario", "pro"],
  },

  // ── Tokens ───────────────────────────────────────────────────
  {
    name: "Tokens de IA por mês",
    category: "Tokens",
    plans: { basico: "~260k", intermediario: "~1,5M", pro: "~4,5M" },
  },
];

export const subscriptionPlans = [
  {
    id: "basico",
    name: "Básico",
    /** Preço mensal em BRL */
    monthlyPrice: 29.90,
    /** Preço anual em BRL (20% de desconto vs. 12x mensal) */
    annualPrice: 287.04,
    tokens: "~260.000 tokens/mês",
    workouts: "2-4 gerações de treino/mês",
    meals: "2-4 gerações de dieta/mês",
    highlight: "Para começar com direção",
    /**
     * Destaques exibidos no cartão do plano.
     * Mostra o que este plano entrega — sem herdar dos anteriores.
     */
    highlights: [
      { name: "Check-in semanal (peso, sinais, aderência)", isIncluded: true },
      { name: "Geração de treino com IA", isIncluded: true },
      { name: "Geração de dieta com IA", isIncluded: true },
      { name: "Chat com Personal Virtual IA", isIncluded: true },
      { name: "Dashboard básico (resumo e feedback)", isIncluded: true },
      { name: "~260k tokens de IA por mês", isIncluded: true },
    ],
    features: [
      "Check-in semanal (peso, altura, saciedade, sono, treino)",
      "Geração de dieta IA com base no perfil básico",
      "Geração de treino IA com base no perfil básico",
      "Chat com Personal Virtual IA",
      "Dashboard básico (resumo e feedback)",
    ],
  },
  {
    id: "intermediario",
    name: "Intermediário",
    monthlyPrice: 59.90,
    annualPrice: 575.04,
    tokens: "~1.500.000 tokens/mês",
    workouts: "4-6 gerações/ajustes de treino",
    meals: "4-6 gerações/ajustes de dieta",
    highlight: "Mais acompanhamento na rotina",
    featured: true,
    /**
     * Destaques: mostra o que este plano adiciona em relação ao Básico.
     */
    highlights: [
      { name: "Tudo do plano Básico, e mais:", isIncluded: true },
      { name: "Check-in mensal completo", isIncluded: true },
      { name: "Medidas corporais completas + bioimpedância", isIncluded: true },
      { name: "Fotos de progresso por check-in", isIncluded: true },
      { name: "IA com histórico de 3 meses", isIncluded: true },
      { name: "Dashboard completo (corpo, cargas, mensal)", isIncluded: true },
    ],
    features: [
      "Check-in semanal e mensal completo",
      "Medidas corporais completas (cintura, quadril, braço, etc.)",
      "Bioimpedância (InBody, Tanita ou similar)",
      "Até 6 fotos de progresso por check-in",
      "Geração de dieta e treino IA com histórico de 3 meses",
      "Chat com contexto expandido",
      "Dashboard completo (corpo, cargas, mensal, feedback)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 99.90,
    annualPrice: 959.04,
    tokens: "~4.500.000 tokens/mês",
    workouts: "Gerações ilimitadas por protocolo",
    meals: "Dietas e substituições completas",
    highlight: "Acesso total à plataforma",
    /**
     * Destaques: mostra o que este plano adiciona em relação ao Intermediário.
     */
    highlights: [
      { name: "Tudo do plano Intermediário, e mais:", isIncluded: true },
      { name: "Check-in diário de sinais", isIncluded: true },
      { name: "Fotos de progresso por check-in", isIncluded: true },
      { name: "IA com contexto total e histórico completo", isIncluded: true },
      { name: "Upload de vídeos de exercícios", isIncluded: true },
      { name: "~4,5M tokens de IA por mês", isIncluded: true },
    ],
    features: [
      "Todos os check-ins (diário, semanal, mensal)",
      "Fotos de progresso ilimitadas",
      "Medidas corporais + bioimpedância completa",
      "IA com contexto total e histórico completo",
      "Chat com histórico completo sem limite",
      "Dashboard premium com todos os insights",
      "Upload de vídeos de exercícios",
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
