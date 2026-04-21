export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Rota nao encontrada.",
    path: req.originalUrl,
  });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || "Erro interno do servidor.",
  });
}
