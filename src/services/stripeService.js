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
          appOrigin: window.location.origin,
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

export async function createStripeSubscriptionChangeSession({
  planId,
  billingCycle,
  prorationEstimate,
}) {
  if (isLocalApiConfigured && getApiToken()) {
    try {
      const data = await apiRequest(apiEndpoints.stripeSubscriptionChangeSession, {
        method: "POST",
        body: JSON.stringify({
          planId,
          billingCycle,
          prorationEstimate,
          appOrigin: window.location.origin,
        }),
      });

      return { url: data?.url || null, mode: data?.mode || null, error: null };
    } catch (error) {
      return { url: null, mode: null, error };
    }
  }

  if (isLocalApiConfigured && !getApiToken()) {
    return {
      url: null,
      mode: null,
      error: new Error("Faca login antes de alterar a assinatura."),
    };
  }

  return {
    url: null,
    mode: null,
    error: new Error("A alteracao de assinatura precisa do backend local conectado ao Stripe."),
  };
}

export async function createStripePaymentMethodSession() {
  if (isLocalApiConfigured && getApiToken()) {
    try {
      const data = await apiRequest(apiEndpoints.stripePaymentMethodSession, {
        method: "POST",
        body: JSON.stringify({
          appOrigin: window.location.origin,
        }),
      });

      return { url: data?.url || null, mode: data?.mode || null, error: null };
    } catch (error) {
      return { url: null, mode: null, error };
    }
  }

  return {
    url: null,
    mode: null,
    error: new Error("Faca login para gerenciar metodos de pagamento no Stripe."),
  };
}

export async function setStripeDefaultPaymentMethod(paymentMethodId) {
  if (isLocalApiConfigured && getApiToken()) {
    try {
      const data = await apiRequest(apiEndpoints.stripeDefaultPaymentMethod, {
        method: "PUT",
        body: JSON.stringify({ paymentMethodId }),
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  return {
    data: null,
    error: new Error("Faca login para trocar o metodo de pagamento padrao."),
  };
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
