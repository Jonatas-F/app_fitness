import { requireSupabase } from "./supabaseClient";
import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken, isLocalApiConfigured } from "./api/client";

export async function createStripeCheckoutSession({
  planId,
  billingCycle,
  installments = 1,
}) {
  if (isLocalApiConfigured && getApiToken()) {
    try {
      const data = await apiRequest(apiEndpoints.stripeCheckoutSession, {
        method: "POST",
        body: JSON.stringify({
          planId,
          billingCycle,
          installments: Number(installments) || 1,
        }),
      });

      return { url: data?.url || null, error: null };
    } catch (error) {
      return { url: null, error };
    }
  }

  if (isLocalApiConfigured && !getApiToken()) {
    return {
      url: null,
      error: new Error("Faca login antes de finalizar a assinatura."),
    };
  }

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
  if (isLocalApiConfigured && getApiToken()) {
    try {
      const data = await apiRequest(apiEndpoints.stripePortalSession, {
        method: "POST",
      });

      return { url: data?.url || null, error: null };
    } catch (error) {
      return { url: null, error };
    }
  }

  const { data, error } = await requireSupabase().functions.invoke(
    "create-portal-session"
  );

  if (error) {
    return { url: null, error };
  }

  return { url: data?.url || null, error: null };
}

export async function loadBillingSubscription() {
  if (!isLocalApiConfigured || !getApiToken()) {
    return { data: null, error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.billingSubscription);
    return { data, error: null, skipped: false };
  } catch (error) {
    return { data: null, error, skipped: false };
  }
}
