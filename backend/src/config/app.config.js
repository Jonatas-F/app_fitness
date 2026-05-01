function normalizeOrigins(values) {
  return values
    .flatMap((value) => String(value || "").split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = Array.from(
  new Set(
    normalizeOrigins([
      process.env.APP_ORIGIN,
      process.env.APP_PREVIEW_ORIGIN,
      process.env.APP_ALLOWED_ORIGINS,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ])
  )
);

export const appConfig = {
  port: Number(process.env.PORT || 3333),
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
  previewOrigin: process.env.APP_PREVIEW_ORIGIN || "http://localhost:4173",
  allowedOrigins,
};
