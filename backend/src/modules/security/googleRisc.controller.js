import { processGoogleSecurityEventToken } from "./googleRisc.service.js";

function extractSecurityEventToken(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8").trim();
  }

  if (typeof req.body === "string") {
    return req.body.trim();
  }

  return req.body?.security_event_token || req.body?.token || "";
}

export async function handleGoogleRiscEvent(req, res, next) {
  try {
    const token = extractSecurityEventToken(req);

    if (!token) {
      const error = new Error("Security Event Token ausente.");
      error.status = 400;
      throw error;
    }

    const result = await processGoogleSecurityEventToken(token);
    res.status(202).json({ received: true, eventId: result.eventId });
  } catch (error) {
    next(error);
  }
}
