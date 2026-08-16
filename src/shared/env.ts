import "dotenv/config";

/**
 * Configuração centralizada, lida uma única vez do ambiente (.env em dev,
 * variáveis reais em outros contextos). Mantém o resto do código sem
 * `process.env` espalhado e com defaults explícitos.
 */
export const env = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",

  databaseUrl: process.env.DATABASE_URL ?? "postgres://payments:payments@localhost:5432/payments",
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://payments:payments@localhost:5672",

  // Usados a partir da Fase 4/5 — já lidos aqui para não espalhar process.env depois.
  idempotencyEnabled: (process.env.IDEMPOTENCY_ENABLED ?? "true") === "true",
  failureRate: Number(process.env.FAILURE_RATE ?? 0),
};
