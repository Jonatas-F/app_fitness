import {
  constructStripeWebhookEvent,
  createCheckoutSession,
  createPortalSession,
  handleStripeEvent,
  listPlanChangeAcceptances,
  loadBillingSummary,
  savePlanChangeAcceptance,
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
    const data = await createPortalSession(req.auth.sub);
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

export async function handleStripeWebhook(req, res, next) {
  try {
    const event = constructStripeWebhookEvent(req.body, req.headers["stripe-signature"]);
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
