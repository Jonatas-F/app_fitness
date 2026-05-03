export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Rota nao encontrada." });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, error);
  }

  // Nunca expor stack trace ou detalhes internos em produção
  const message =
    process.env.NODE_ENV === "production" && status >= 500
      ? "Erro interno do servidor."
      : error.message || "Erro interno do servidor.";

  res.status(status).json({ error: message });
}
