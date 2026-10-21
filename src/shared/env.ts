import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://payments:payments@localhost:5432/payments",
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://payments:payments@localhost:5672",
  idempotencyEnabled: (process.env.IDEMPOTENCY_ENABLED ?? "true") === "true",
  idempotencyLockTimeoutMs: Number(process.env.IDEMPOTENCY_LOCK_TIMEOUT_MS ?? 30_000),
  idempotencyKeyTtlMs: Number(process.env.IDEMPOTENCY_KEY_TTL_MS ?? 86_400_000),
  outboxRelayIntervalMs: Number(process.env.OUTBOX_RELAY_INTERVAL_MS ?? 1000),
  outboxRelayMinAgeMs: Number(process.env.OUTBOX_RELAY_MIN_AGE_MS ?? 5000),
  workerPrefetch: Number(process.env.WORKER_PREFETCH ?? 10),
  failureRate: Number(process.env.FAILURE_RATE ?? 0),
  failureModes: process.env.FAILURE_MODES ?? "exception,timeout,unavailable",
  chaosTimeoutMs: Number(process.env.CHAOS_TIMEOUT_MS ?? 300),
  maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 4),
  retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 1000),
};
