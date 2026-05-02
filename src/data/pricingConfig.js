/**
 * Shape Certo — Pricing & Cost Configuration
 *
 * Source of truth para preços e custos do SaaS.
 * Todos os valores calculados no arquivo:
 *   src/data/shape_certo_business_plan.xlsx
 *
 * Última revisão: Mai 2026
 * Câmbio de referência: USD 1 = BRL 5.70
 *
 * COMO RECALCULAR:
 *   1. Abra shape_certo_business_plan.xlsx
 *   2. Atualize Assumptions!B5 (câmbio) e B11/B12 (preços OpenAI)
 *   3. Verifique margens na aba Unit_Economics (células amarelas = preços)
 *   4. Atualize COST_CONFIG abaixo se custos mudaram
 *   5. Atualize PLAN_PRICES se preços mudaram
 */

// ─── Câmbio e custos de API (atualizar mensalmente) ──────────────────────────
export const COST_CONFIG = {
  /** Câmbio de referência — atualizar mensalmente */
  usdToBrl: 5.70,

  openai: {
    /** GPT-4o-mini — USD por 1 milhão de tokens */
    inputPricePerMToken:  0.150,
    outputPricePerMToken: 0.600,
    model: "gpt-4o-mini",
  },

  stripe: {
    /** Cartão nacional Brasil */
    brPercent:   0.0399,   // 3.99%
    brFixedBrl:  0.39,     // R$ 0.39 por transação
    /** Cartão internacional */
    intlPercent: 0.029,    // 2.9%
    intlFixedUsd: 0.30,    // $0.30 por transação
  },

  infra: {
    /** USD por mês — base para ~500 usuários, dobrar servidor a partir de 1.000 */
    serverUsd:    30.0,
    databaseUsd:  20.0,
    s3BaseUsd:     5.0,
    s3PerGbUsd:    0.023,
    cdnUsd:        5.0,
    monitoringUsd: 5.0,
  },
};

// ─── Perfil de tokens por plano ──────────────────────────────────────────────
export const TOKEN_PROFILES = {
  basico: {
    /** Tokens de contexto (input) por mensagem de chat */
    contextTokensPerMsg:   2_000,
    /** Tokens de output por resposta */
    outputTokensPerMsg:      350,
    /** Tokens de input por geração IA (dieta + treino) */
    genInputTokens:        5_000,
    /** Tokens de output por geração IA */
    genOutputTokens:         800,
    /** Mensagens/dia — cenário conservador */
    msgsPerDayConservative:    2,
    /** Mensagens/dia — cenário moderado (pior caso para precificação) */
    msgsPerDayModerate:        4,
    /** Gerações IA/mês — cenário conservador */
    generationsPerMonthConservative: 2,
    /** Gerações IA/mês — cenário moderado */
    generationsPerMonthModerate:     4,
  },
  intermediario: {
    contextTokensPerMsg:   8_000,
    outputTokensPerMsg:      450,
    genInputTokens:       12_000,
    genOutputTokens:       1_200,
    msgsPerDayConservative:    3,
    msgsPerDayModerate:        6,
    generationsPerMonthConservative: 4,
    generationsPerMonthModerate:     6,
  },
  pro: {
    contextTokensPerMsg:  18_000,
    outputTokensPerMsg:      550,
    genInputTokens:       20_000,
    genOutputTokens:       2_000,
    msgsPerDayConservative:    4,
    msgsPerDayModerate:        8,
    generationsPerMonthConservative:  6,
    generationsPerMonthModerate:     10,
  },
};

// ─── Preços dos planos (atualizar junto com Unit_Economics) ──────────────────
export const PLAN_PRICES = {
  basico: {
    monthlyBrl:  29.90,
    annualBrl:  287.04,  // 29.90 × 12 × 0.80
    monthlyUsd:   5.25,
    annualUsd:   50.36,
  },
  intermediario: {
    monthlyBrl:  59.90,
    annualBrl:  575.04,  // 59.90 × 12 × 0.80
    monthlyUsd:  10.51,
    annualUsd:  100.88,
  },
  pro: {
    monthlyBrl:  99.90,
    annualBrl:  959.04,  // 99.90 × 12 × 0.80
    monthlyUsd:  17.53,
    annualUsd:  168.25,
  },
};

// ─── Custos calculados por usuário/mês (cenário moderado, 1.000 users) ──────
// Valores de referência — NÃO usados em runtime, apenas para documentação
export const UNIT_COSTS_REFERENCE = {
  /** Custo OpenAI (USD/usuário/mês) — cenário moderado */
  openaiUsdPerUser: {
    basico:        0.0661,
    intermediario: 0.2797,
    pro:           0.7692,
  },
  /** Custo infra (USD/usuário/mês) @ 1.000 usuários */
  infraUsdPerUser: 0.1002,
  /** Custo Stripe (BRL/usuário/mês) nos preços sugeridos */
  stripeBrlPerUser: {
    basico:        1.5830,
    intermediario: 2.7800,
    pro:           4.3760,
  },
  /** Custo total (BRL/usuário/mês) — cenário moderado @ 1.000 users */
  totalBrlPerUser: {
    basico:        2.53,
    intermediario: 4.95,
    pro:           9.33,
  },
  /** Margem bruta nos preços sugeridos */
  grossMargin: {
    basico:        0.915,   // 91.5%
    intermediario: 0.917,   // 91.7%
    pro:           0.907,   // 90.7%
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcula custo OpenAI estimado para uma chamada de chat.
 * @param {number} inputTokens  — tokens de entrada (contexto + mensagem)
 * @param {number} outputTokens — tokens de saída (resposta)
 * @returns {{ usd: number, brl: number }}
 */
export function estimateOpenAICost(inputTokens, outputTokens) {
  const usd =
    (inputTokens  / 1_000_000) * COST_CONFIG.openai.inputPricePerMToken +
    (outputTokens / 1_000_000) * COST_CONFIG.openai.outputPricePerMToken;
  return { usd, brl: usd * COST_CONFIG.usdToBrl };
}

/**
 * Calcula a taxa Stripe para uma transação no Brasil.
 * @param {number} amountBrl — valor da transação em BRL
 * @returns {number} taxa total em BRL
 */
export function stripeFeeBrl(amountBrl) {
  return amountBrl * COST_CONFIG.stripe.brPercent + COST_CONFIG.stripe.brFixedBrl;
}

/**
 * Retorna o perfil de tokens para um plano.
 * @param {"basico"|"intermediario"|"pro"} planId
 * @returns {object}
 */
export function getTokenProfile(planId) {
  return TOKEN_PROFILES[planId] ?? TOKEN_PROFILES.basico;
}

/**
 * Retorna preços de um plano.
 * @param {"basico"|"intermediario"|"pro"} planId
 * @returns {object}
 */
export function getPlanPrices(planId) {
  return PLAN_PRICES[planId] ?? PLAN_PRICES.basico;
}
