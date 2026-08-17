import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://payments:payments@localhost:5432/payments",
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://payments:payments@localhost:5672",
  idempotencyEnabled: (process.env.IDEMPOTENCY_ENABLED ?? "true") === "true",
  failureRate: Number(process.env.FAILURE_RATE ?? 0),
};
