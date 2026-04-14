export type BillingCycle = "monthly" | "annual";

type Plan = {
  id: "basico" | "intermediario" | "avancado";
  name: string;
  monthlyPrice: number;
  tokenLimit: number;
};

export const plans: Plan[] = [
  {
    id: "basico",
    name: "Basico",
    monthlyPrice: 39,
    tokenLimit: 25000,
  },
  {
    id: "intermediario",
    name: "Intermediario",
    monthlyPrice: 79,
    tokenLimit: 90000,
  },
  {
    id: "avancado",
    name: "Avancado",
    monthlyPrice: 149,
    tokenLimit: 250000,
  },
];

export function getPlanById(planId: string) {
  return plans.find((plan) => plan.id === planId) || plans[1];
}

export function getStripeAmount(plan: Plan, billingCycle: BillingCycle) {
  const amount = billingCycle === "annual" ? plan.monthlyPrice * 12 * 0.8 : plan.monthlyPrice;
  return Math.round(amount * 100);
}

export function getCycleLabel(billingCycle: BillingCycle) {
  return billingCycle === "annual" ? "Anual com 20% off" : "Mensal recorrente";
}
