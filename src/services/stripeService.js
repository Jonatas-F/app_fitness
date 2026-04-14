import { requireSupabase } from "./supabaseClient";

export async function createStripeCheckoutSession({
  planId,
  billingCycle,
  installments = 1,
}) {
  const { data, error } = await requireSupabase().functions.invoke(
    "create-checkout-session",
    {
      body: {
        planId,
        billingCycle,
        installments: Number(installments) || 1,
      },
    }
  );

  if (error) {
    return { url: null, error };
  }

  return { url: data?.url || null, error: null };
}

export async function createStripePortalSession() {
  const { data, error } = await requireSupabase().functions.invoke(
    "create-portal-session"
  );

  if (error) {
    return { url: null, error };
  }

  return { url: data?.url || null, error: null };
}
