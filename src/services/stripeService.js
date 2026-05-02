import { apiEndpoints } from "./api/endpoints";
import { apiRequest, getApiToken } from "./api/client";

export async function createStripeCheckoutSession({
  planId,
  billingCycle,
  installments = 1,
  returnMode = "redirect",
}) {
  if (!getApiToken()) {
    return { url: null, error: new Error("Faça login antes de finalizar a assinatura.") };
  }

  try {
    const data = await apiRequest(apiEndpoints.stripeCheckoutSession, {
      method: "POST",
      body: JSON.stringify({
        planId,
        billingCycle,
        installments: Number(installments) || 1,
        appOrigin: window.location.origin,
        returnMode,
      }),
    });

    return { url: data?.url || null, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

export async function createStripePortalSession() {
  if (!getApiToken()) {
    return { url: null, error: new Error("Faça login para acessar o portal de pagamentos.") };
  }

  try {
    const data = await apiRequest(apiEndpoints.stripePortalSession, {
      method: "POST",
      body: JSON.stringify({ appOrigin: window.location.origin, returnMode: "popup" }),
    });

    return { url: data?.url || null, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

export async function createStripeSubscriptionChangeSession({
  planId,
  billingCycle,
  prorationEstimate,
  returnMode = "redirect",
}) {
  if (!getApiToken()) {
    return { url: null, mode: null, error: new Error("Faça login antes de alterar a assinatura.") };
  }

  try {
    const data = await apiRequest(apiEndpoints.stripeSubscriptionChangeSession, {
      method: "POST",
      body: JSON.stringify({
        planId,
        billingCycle,
        prorationEstimate,
        appOrigin: window.location.origin,
        returnMode,
      }),
    });

    return { url: data?.url || null, mode: data?.mode || null, error: null };
  } catch (error) {
    return { url: null, mode: null, error };
  }
}

export async function createStripePaymentMethodSession() {
  if (!getApiToken()) {
    return { url: null, mode: null, error: new Error("Faça login para gerenciar métodos de pagamento.") };
  }

  try {
    const data = await apiRequest(apiEndpoints.stripePaymentMethodSession, {
      method: "POST",
      body: JSON.stringify({ appOrigin: window.location.origin, returnMode: "popup" }),
    });

    return { url: data?.url || null, mode: data?.mode || null, error: null };
  } catch (error) {
    return { url: null, mode: null, error };
  }
}

export async function setStripeDefaultPaymentMethod(paymentMethodId) {
  if (!getApiToken()) {
    return { data: null, error: new Error("Faça login para trocar o método de pagamento padrão.") };
  }

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

export async function loadBillingSubscription() {
  if (!getApiToken()) {
    return { data: null, error: null, skipped: true };
  }

  try {
    const data = await apiRequest(apiEndpoints.billingSubscription);
    return { data, error: null, skipped: false };
  } catch (error) {
    return { data: null, error, skipped: false };
  }
}
