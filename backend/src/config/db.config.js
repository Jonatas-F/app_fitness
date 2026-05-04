// Em produção com SSL ativado, rejeitamos certificados inválidos (rejectUnauthorized: true).
// Para banco local (localhost) não é necessário DATABASE_SSL=true.
// Para banco externo/gerenciado com cert próprio, sete DATABASE_SSL=true.
// Se usar CA customizada, defina DATABASE_SSL_CA com o caminho do arquivo .pem.
import { readFileSync } from "node:fs";

function buildSslConfig() {
  if (process.env.DATABASE_SSL !== "true") return false;

  const config = {
    rejectUnauthorized: process.env.NODE_ENV === "production",
  };

  if (process.env.DATABASE_SSL_CA) {
    try {
      config.ca = readFileSync(process.env.DATABASE_SSL_CA).toString();
    } catch {
      console.warn("[DB] DATABASE_SSL_CA nao encontrado, prosseguindo sem CA customizada.");
    }
  }

  return config;
}

export const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(),
};
