import { ZodError } from "zod";

/**
 * Middleware de validação de entrada com Zod.
 *
 * Uso: app.post("/rota", validate(meuSchema), handler)
 *
 * Em caso de erro de validação, retorna 400 com mensagem legível.
 * Em caso de sucesso, substitui req.body pelo objeto parseado (tipado e sanitizado).
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body ?? {});
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors
          .map((e) => e.message)
          .join("; ");

        return res.status(400).json({ error: message });
      }

      next(error);
    }
  };
}
