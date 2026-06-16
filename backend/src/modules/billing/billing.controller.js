import {
  constructStripeWebhookEvent,
  createCheckoutSession,
  createPaymentMethodSession,
  createPortalSession,
  createSubscriptionChangeSession,
  handleStripeEvent,
  listPlanChangeAcceptances,
  listStripePaymentMethods,
  loadBillingSummary,
  loadTokenHistory,
  savePlanChangeAcceptance,
  setDefaultStripePaymentMethod,
} from "./billing.service.js";

export async function handleSavePlanChangeAcceptance(req, res, next) {
  try {
    const data = await savePlanChangeAcceptance(req.auth.sub, req.body);
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function handleListPlanChangeAcceptances(req, res, next) {
  try {
    const data = await listPlanChangeAcceptances(req.auth.sub);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateStripeCheckoutSession(req, res, next) {
  try {
    const data = await createCheckoutSession(req.auth.sub, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateStripePortalSession(req, res, next) {
  try {
    const data = await createPortalSession(req.auth.sub, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateStripePaymentMethodSession(req, res, next) {
  try {
    const data = await createPaymentMethodSession(req.auth.sub, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleListStripePaymentMethods(req, res, next) {
  try {
    const paymentMethods = await listStripePaymentMethods(req.auth.sub);
    res.json({ paymentMethods });
  } catch (error) {
    next(error);
  }
}

export async function handleSetDefaultStripePaymentMethod(req, res, next) {
  try {
    const data = await setDefaultStripePaymentMethod(req.auth.sub, req.body.paymentMethodId);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleCreateStripeSubscriptionChangeSession(req, res, next) {
  try {
    const data = await createSubscriptionChangeSession(req.auth.sub, req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleLoadBillingSummary(req, res, next) {
  try {
    const data = await loadBillingSummary(req.auth.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function handleLoadTokenHistory(req, res, next) {
  try {
    const history = await loadTokenHistory(req.auth.sub);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

export async function handleStripeWebhook(req, res, next) {
  try {
    const event = constructStripeWebhookEvent(req.body, req.headers["stripe-signature"]);
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
