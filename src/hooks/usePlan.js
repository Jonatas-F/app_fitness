import { useEffect, useState } from "react";
import { getStoredApiUser, apiRequest } from "../services/api/client";
import { apiEndpoints } from "../services/api/endpoints";

const ADMIN_EMAIL = "jonatas.freire.prof@gmail.com";
const ADMIN_PLAN_OVERRIDE_KEY = "shapeCertoAdminPlanOverride";

/**
 * Matriz de acesso por plano.
 * - Array de strings → feature booleana: true se planId estiver na lista
 * - Objeto            → feature com limite numérico por plano
 */
const ACCESS_MATRIX = {
  // check-ins
  checkin_weekly:       ["basico", "intermediario", "pro"],
  checkin_monthly:      ["intermediario", "pro"],
  checkin_daily:        ["pro"],
  bioimpedance:         ["intermediario", "pro"],
  photo_upload:         ["basico", "intermediario", "pro"],
  photo_limit:          { basico: 2, intermediario: 5, pro: Infinity },
  body_measurements:    ["intermediario", "pro"],

  // dashboard
  dashboard_resumo:     ["basico", "intermediario", "pro"],
  dashboard_corpo:      ["intermediario", "pro"],
  dashboard_cargas:     ["intermediario", "pro"],
  dashboard_mensal:     ["intermediario", "pro"],
  dashboard_feedback:   ["basico", "intermediario", "pro"],

  // treinos
  workout_video_upload: ["intermediario", "pro"],

  // dieta
  diet_history:         ["intermediario", "pro"],
};

/**
 * Verifica se uma feature está disponível para o plano.
 * Features com limite numérico retornam true (use getPlanLimit() para o número).
 */
export function canAccessFeature(feature, planId) {
  const rule = ACCESS_MATRIX[feature];
  if (!rule) return true;                     // feature desconhecida = liberada
  if (Array.isArray(rule)) return rule.includes(planId ?? "intermediario");
  return true;                                // limites numéricos sempre "acessíveis"
}

/**
 * Retorna o limite numérico de uma feature para o plano.
 * Para features booleanas retorna Infinity.
 */
export function getPlanLimit(feature, planId) {
  const rule = ACCESS_MATRIX[feature];
  if (rule && !Array.isArray(rule)) {
    return rule[planId ?? "intermediario"] ?? Infinity;
  }
  return Infinity;
}

/**
 * Hook principal.
 * Retorna:
 *   planId          — 'basico' | 'intermediario' | 'pro'
 *   isBasico        — boolean
 *   isIntermediario — boolean
 *   isPro           — boolean
 *   isAdmin         — boolean (email === ADMIN_EMAIL)
 *   canAccess(f)    — canAccessFeature(f, planId)
 *   getLimit(f)     — getPlanLimit(f, planId)
 *   subscription    — objeto raw do banco (token_balance, token_limit, current_period_end…)
 */
export function usePlan() {
  const storedUser = getStoredApiUser();
  const isAdmin = storedUser?.email === ADMIN_EMAIL;

  // Override de plano para o admin (persiste no localStorage)
  const [planOverride, setPlanOverride] = useState(
    () => (isAdmin ? localStorage.getItem(ADMIN_PLAN_OVERRIDE_KEY) : null)
  );

  // Dados de subscription da API
  const [subscription, setSubscription] = useState(null);

  // Ouve evento de override disparado pelo AdminPlanSwitcher
  useEffect(() => {
    function onOverride(e) {
      setPlanOverride(e.detail);
    }
    window.addEventListener("shape-certo-plan-override", onOverride);
    return () => window.removeEventListener("shape-certo-plan-override", onOverride);
  }, []);

  // Ouve mudanças de auth (login/logout) para reler o storedUser
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    function onAuth() { forceUpdate((n) => n + 1); }
    window.addEventListener("shape-certo-auth-updated", onAuth);
    return () => window.removeEventListener("shape-certo-auth-updated", onAuth);
  }, []);

  // Carrega subscription uma vez
  useEffect(() => {
    if (!storedUser) return;
    apiRequest(apiEndpoints.billingSubscription)
      .then((data) => setSubscription(data?.subscription ?? null))
      .catch(() => {});
  }, [storedUser?.email]);

  // planId final: override (admin) > plan_type do usuário > fallback
  const rawPlanId = storedUser?.plan_type ?? "intermediario";
  // Normaliza 'avancado' → 'pro' no lado do cliente também
  const normalizedPlanId = rawPlanId === "avancado" ? "pro" : rawPlanId;
  const planId = (isAdmin && planOverride) ? planOverride : normalizedPlanId;

  return {
    planId,
    isBasico:        planId === "basico",
    isIntermediario: planId === "intermediario",
    isPro:           planId === "pro",
    isAdmin,
    canAccess:       (feature) => canAccessFeature(feature, planId),
    getLimit:        (feature) => getPlanLimit(feature, planId),
    subscription,
  };
}
