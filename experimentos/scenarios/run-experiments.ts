import "dotenv/config";
import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream, mkdirSync, writeFileSync, type WriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import amqp from "amqplib";
import pg from "pg";
import { type Scenario, SCENARIOS } from "./scenarios.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const resultsRoot = path.join(projectRoot, "experimentos", "resultados");
const EXPERIMENT_DATABASE = "payments_experiments";
const EXPERIMENT_VHOST = "experiments";
const API_PORT = 3100;
const DEAD_LETTER_QUEUE = "payments.dead-letter";

const adminDatabaseUrl = new URL(
  process.env.DATABASE_URL ?? "postgres://payments:payments@localhost:5432/payments",
);
const experimentDatabaseUrl = new URL(adminDatabaseUrl);
experimentDatabaseUrl.pathname = `/${EXPERIMENT_DATABASE}`;

const baseRabbitUrl = new URL(
  process.env.RABBITMQ_URL ?? "amqp://payments:payments@localhost:5672",
);
const experimentRabbitUrl = new URL(baseRabbitUrl);
experimentRabbitUrl.pathname = `/${EXPERIMENT_VHOST}`;
const managementBaseUrl = `http://${baseRabbitUrl.hostname}:${process.env.RABBITMQ_MGMT_PORT ?? 15672}/api`;
const managementAuth = `Basic ${Buffer.from(
  `${decodeURIComponent(baseRabbitUrl.username)}:${decodeURIComponent(baseRabbitUrl.password)}`,
).toString("base64")}`;
const apiBaseUrl = `http://localhost:${API_PORT}`;

interface PlannedRequest {
  key: string;
  amount: string;
  isDuplicate: boolean;
}

interface RequestResult extends PlannedRequest {
  httpStatus: number;
  latencyMs: number;
  paymentId: string | null;
}

interface PaymentRow {
  id: string;
  status: string;
  attempts: number;
  created_at: Date;
  final_event_at: Date | null;
  created_event_at: Date | null;
}

async function management(method: string, resource: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${managementBaseUrl}${resource}`, {
    method,
    headers: { authorization: managementAuth, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`RabbitMQ management ${method} ${resource} -> ${response.status}`);
  }
  return response;
}

async function ensureVhost(): Promise<void> {
  const vhost = encodeURIComponent(EXPERIMENT_VHOST);
  const user = encodeURIComponent(decodeURIComponent(baseRabbitUrl.username));
  await management("PUT", `/vhosts/${vhost}`);
  await management("PUT", `/permissions/${vhost}/${user}`, {
    configure: ".*",
    write: ".*",
    read: ".*",
  });
}

async function deleteExperimentQueues(): Promise<void> {
  const vhost = encodeURIComponent(EXPERIMENT_VHOST);
  const response = await management("GET", `/queues/${vhost}`);
  const queues = (await response.json()) as { name: string }[];
  for (const queue of queues) {
    await management("DELETE", `/queues/${vhost}/${encodeURIComponent(queue.name)}`);
  }
}

async function ensureDatabase(): Promise<void> {
  const client = new pg.Client({ connectionString: adminDatabaseUrl.toString() });
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    EXPERIMENT_DATABASE,
  ]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE ${EXPERIMENT_DATABASE}`);
  }
  await client.end();
}

function runNodeScript(script: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)),
    );
  });
}

function startService(
  script: string,
  env: NodeJS.ProcessEnv,
  log: WriteStream,
  readyText?: string,
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", script], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
    });
    let ready = readyText === undefined;
    if (ready) {
      resolve(child);
    }
    const onOutput = (chunk: Buffer) => {
      log.write(chunk);
      if (!ready && readyText && chunk.toString().includes(readyText)) {
        ready = true;
        resolve(child);
      }
    };
    child.stdout.on("data", onOutput);
    child.stderr.on("data", onOutput);
    child.on("exit", (code) => {
      if (!ready) {
        reject(new Error(`${script} exited with ${code} before becoming ready`));
      }
    });
  });
}

async function stopService(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exited;
}

async function waitForApi(timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${apiBaseUrl}/health`).catch(() => null);
    if (response?.ok) {
      return;
    }
    await sleep(200);
  }
  throw new Error("API did not become healthy in time");
}

function randomAmount(): string {
  return (Math.floor(Math.random() * 99_900) / 100 + 1).toFixed(2);
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

function buildRequestPlan(totalRequests: number, duplicateRate: number): PlannedRequest[] {
  const uniqueCount = Math.round(totalRequests * (1 - duplicateRate));
  const originals: PlannedRequest[] = Array.from({ length: uniqueCount }, () => ({
    key: randomUUID(),
    amount: randomAmount(),
    isDuplicate: false,
  }));
  const duplicates: PlannedRequest[] = Array.from({ length: totalRequests - uniqueCount }, () => {
    const original = originals[Math.floor(Math.random() * uniqueCount)] as PlannedRequest;
    return { ...original, isDuplicate: true };
  });
  return shuffle([...originals, ...duplicates]);
}

async function postPayment(
  planned: PlannedRequest,
): Promise<{ httpStatus: number; paymentId: string | null }> {
  try {
    const response = await fetch(`${apiBaseUrl}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": planned.key },
      body: JSON.stringify({ amount: planned.amount, currency: "BRL" }),
    });
    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    return {
      httpStatus: response.status,
      paymentId: response.status === 202 ? (body?.id ?? null) : null,
    };
  } catch {
    return { httpStatus: 0, paymentId: null };
  }
}

async function sendRequests(plan: PlannedRequest[], concurrency: number) {
  const results: RequestResult[] = new Array(plan.length);
  let nextIndex = 0;

  async function lane(): Promise<void> {
    while (nextIndex < plan.length) {
      const index = nextIndex++;
      const planned = plan[index] as PlannedRequest;
      const startedAt = performance.now();
      const outcome = await postPayment(planned);
      results[index] = { ...planned, ...outcome, latencyMs: performance.now() - startedAt };
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, lane));
  return { results, durationMs: performance.now() - startedAt };
}

async function countPending(client: pg.Client): Promise<number> {
  const result = await client.query(
    "SELECT count(*)::int AS n FROM payments WHERE status = 'PENDING'",
  );
  return result.rows[0].n;
}

async function waitForConsistency(client: pg.Client, timeoutMs: number) {
  const startedAt = performance.now();
  const deadline = Date.now() + timeoutMs;
  let pending = await countPending(client);
  while (pending > 0 && Date.now() < deadline) {
    await sleep(250);
    pending = await countPending(client);
  }
  return { pending, waitedMs: performance.now() - startedAt };
}

function percentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) {
    return null;
  }
  const index = Math.min(sortedValues.length - 1, Math.ceil((p / 100) * sortedValues.length) - 1);
  return sortedValues[Math.max(0, index)] as number;
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.length === 0 ? null : sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return {
    n: sorted.length,
    media: mean === null ? null : round(mean),
    p50: nullableRound(percentile(sorted, 50)),
    p95: nullableRound(percentile(sorted, 95)),
    max: nullableRound(sorted.at(-1) ?? null),
  };
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function nullableRound(value: number | null): number | null {
  return value === null ? null : round(value);
}

function countBy<T>(items: T[], keyOf: (item: T) => string | number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = String(keyOf(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const escape = (value: unknown) => {
    const text = value instanceof Date ? value.toISOString() : String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
}

async function collectPayments(client: pg.Client): Promise<PaymentRow[]> {
  const result = await client.query<PaymentRow>(`
    SELECT p.id, p.status, p.attempts, p.created_at,
      (SELECT min(e.created_at) FROM payment_events e
        WHERE e.payment_id = p.id AND e.type = 'CREATED') AS created_event_at,
      (SELECT max(e.created_at) FROM payment_events e
        WHERE e.payment_id = p.id AND e.type IN ('APPROVED', 'FAILED')) AS final_event_at
    FROM payments p
    ORDER BY p.created_at`);
  return result.rows;
}

async function deadLetterDepth(): Promise<number> {
  const connection = await amqp.connect(experimentRabbitUrl.toString());
  try {
    const channel = await connection.createChannel();
    const { messageCount } = await channel.checkQueue(DEAD_LETTER_QUEUE);
    await channel.close();
    return messageCount;
  } finally {
    await connection.close();
  }
}

function computeResults(
  scenario: Scenario,
  requests: RequestResult[],
  loadDurationMs: number,
  payments: PaymentRow[],
  pendingAtEnd: number,
  dlqDepth: number,
  eventsByType: Record<string, number>,
  failuresByMode: Record<string, number>,
) {
  const statusById = new Map(payments.map((p) => [p.id, p.status]));
  const paymentIdsByKey = new Map<string, Set<string>>();
  for (const request of requests) {
    const ids = paymentIdsByKey.get(request.key) ?? new Set<string>();
    if (request.paymentId) {
      ids.add(request.paymentId);
    }
    paymentIdsByKey.set(request.key, ids);
  }

  const uniqueExpected = paymentIdsByKey.size;
  const duplicatesSent = requests.length - uniqueExpected;
  let duplicatePaymentsCreated = 0;
  let keysApproved = 0;
  let keysChargedMoreThanOnce = 0;
  let extraCharges = 0;
  for (const ids of paymentIdsByKey.values()) {
    duplicatePaymentsCreated += Math.max(0, ids.size - 1);
    const approvedCount = [...ids].filter((id) => statusById.get(id) === "APPROVED").length;
    if (approvedCount >= 1) {
      keysApproved++;
    }
    if (approvedCount >= 2) {
      keysChargedMoreThanOnce++;
      extraCharges += approvedCount - 1;
    }
  }

  const approved = payments.filter((p) => p.status === "APPROVED");
  const failed = payments.filter((p) => p.status === "FAILED");
  const consistencyTimes = payments
    .filter((p) => p.final_event_at && p.created_event_at)
    .map((p) => (p.final_event_at as Date).getTime() - (p.created_event_at as Date).getTime());

  return {
    total_requisicoes: requests.length,
    pagamentos_unicos_esperados: uniqueExpected,
    duplicatas_enviadas: duplicatesSent,
    pagamentos_criados: payments.length,
    pagamentos_duplicados_criados: duplicatePaymentsCreated,
    duplicatas_bloqueadas: duplicatesSent - duplicatePaymentsCreated,
    clientes_cobrados_em_duplicidade: keysChargedMoreThanOnce,
    cobrancas_extras_aprovadas: extraCharges,
    respostas_http: countBy(requests, (r) => r.httpStatus),
    aprovados: approved.length,
    falhados: failed.length,
    pendentes_ao_fim: pendingAtEnd,
    taxa_sucesso_final: round(keysApproved / uniqueExpected, 4),
    taxa_falha_definitiva: round(failed.length / Math.max(1, payments.length), 4),
    tentativas_medias_aprovados:
      approved.length === 0
        ? null
        : round(approved.reduce((sum, p) => sum + p.attempts, 0) / approved.length, 3),
    distribuicao_tentativas_aprovados: countBy(approved, (p) => p.attempts),
    tempo_consistencia_ms: stats(consistencyTimes),
    latencia_http_ms: stats(requests.map((r) => r.latencyMs)),
    duracao_carga_ms: round(loadDurationMs),
    throughput_req_s: round(requests.length / (loadDurationMs / 1000)),
    mensagens_na_dlq: dlqDepth,
    eventos_por_tipo: eventsByType,
    falhas_por_modo: failuresByMode,
    parametros_retry_delays_ms: Array.from(
      { length: scenario.maxAttempts - 1 },
      (_, i) => scenario.retryBaseDelayMs * 4 ** i,
    ),
  };
}

async function runScenario(scenario: Scenario, repetition: number): Promise<string> {
  const startedAt = new Date();
  const runName = `rep-${repetition}_${startedAt.toISOString().replace(/[:.]/g, "-")}`;
  const scenarioDir = path.join(resultsRoot, scenario.id);
  mkdirSync(scenarioDir, { recursive: true });
  const log = createWriteStream(path.join(scenarioDir, `${runName}.log`));

  const client = new pg.Client({ connectionString: experimentDatabaseUrl.toString() });
  await client.connect();
  await client.query("TRUNCATE payment_events, idempotency_keys, payments, outbox_messages");
  await deleteExperimentQueues();

  const serviceEnv: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    DATABASE_URL: experimentDatabaseUrl.toString(),
    RABBITMQ_URL: experimentRabbitUrl.toString(),
    PORT: String(API_PORT),
    IDEMPOTENCY_ENABLED: String(scenario.idempotencyEnabled),
    FAILURE_RATE: String(scenario.failureRate),
    FAILURE_MODES: scenario.failureModes,
    CHAOS_TIMEOUT_MS: String(scenario.chaosTimeoutMs),
    MAX_ATTEMPTS: String(scenario.maxAttempts),
    RETRY_BASE_DELAY_MS: String(scenario.retryBaseDelayMs),
    WORKER_PREFETCH: String(scenario.workerPrefetch),
  };

  let worker: ChildProcess | undefined;
  let api: ChildProcess | undefined;
  try {
    worker = await startService(
      "src/worker/consumer.ts",
      { ...serviceEnv, LOG_LEVEL: "info" },
      log,
      "Worker consumindo",
    );
    api = await startService("src/api/server.ts", { ...serviceEnv, LOG_LEVEL: "warn" }, log);
    await waitForApi();

    const plan = buildRequestPlan(scenario.totalRequests, scenario.duplicateRate);
    const { results: requests, durationMs } = await sendRequests(plan, scenario.concurrency);

    const worstCaseRetryMs = Array.from(
      { length: scenario.maxAttempts - 1 },
      (_, i) => scenario.retryBaseDelayMs * 4 ** i,
    ).reduce((sum, delay) => sum + delay, 0);
    const { pending, waitedMs } = await waitForConsistency(client, worstCaseRetryMs + 90_000);

    const payments = await collectPayments(client);
    const eventRows = await client.query(
      "SELECT type, count(*)::int AS n FROM payment_events GROUP BY type ORDER BY type",
    );
    const modeRows = await client.query(
      "SELECT payload->>'mode' AS mode, count(*)::int AS n FROM payment_events WHERE type = 'FAILED_ATTEMPT' GROUP BY 1 ORDER BY 1",
    );
    const dlqDepth = await deadLetterDepth();

    const record = {
      cenario: scenario.id,
      descricao: scenario.description,
      repeticao: repetition,
      data_execucao: startedAt.toISOString(),
      espera_consistencia_ms: round(waitedMs),
      parametros: {
        idempotency_enabled: scenario.idempotencyEnabled,
        failure_rate: scenario.failureRate,
        failure_modes: scenario.failureModes,
        chaos_timeout_ms: scenario.chaosTimeoutMs,
        duplicate_rate: scenario.duplicateRate,
        max_attempts: scenario.maxAttempts,
        retry_base_delay_ms: scenario.retryBaseDelayMs,
        worker_prefetch: scenario.workerPrefetch,
        concurrency: scenario.concurrency,
        total_requests: scenario.totalRequests,
      },
      ambiente: {
        node: process.version,
        so: `${os.type()} ${os.release()}`,
        cpu: os.cpus()[0]?.model ?? "unknown",
        nucleos: os.cpus().length,
      },
      resultados: computeResults(
        scenario,
        requests,
        durationMs,
        payments,
        pending,
        dlqDepth,
        Object.fromEntries(eventRows.rows.map((row) => [row.type, row.n])),
        Object.fromEntries(modeRows.rows.map((row) => [row.mode, row.n])),
      ),
    };

    const basePath = path.join(scenarioDir, runName);
    writeFileSync(`${basePath}.json`, JSON.stringify(record, null, 2));
    writeFileSync(
      `${basePath}-requests.csv`,
      toCsv(
        requests.map((r) => ({
          idempotency_key: r.key,
          duplicata: r.isDuplicate,
          http_status: r.httpStatus,
          latencia_ms: round(r.latencyMs),
          payment_id: r.paymentId ?? "",
        })),
      ),
    );
    writeFileSync(
      `${basePath}-payments.csv`,
      toCsv(
        payments.map((p) => ({
          id: p.id,
          status: p.status,
          attempts: p.attempts,
          created_event_at: p.created_event_at,
          final_event_at: p.final_event_at,
        })),
      ),
    );
    return `${basePath}.json`;
  } finally {
    await stopService(api);
    await stopService(worker);
    await client.end();
    log.end();
  }
}

function parseArgs() {
  const args = new Map(
    process.argv.slice(2).map((arg) => {
      const [name, value] = arg.replace(/^--/, "").split("=");
      return [name, value ?? "true"] as const;
    }),
  );
  const only = args.get("only")?.split(",");
  return {
    repetitions: Number(args.get("repetitions") ?? 3),
    scenarios: only ? SCENARIOS.filter((s) => only.includes(s.id)) : SCENARIOS,
  };
}

async function main(): Promise<void> {
  const { repetitions, scenarios } = parseArgs();
  await ensureVhost();
  await ensureDatabase();
  await runNodeScript("src/db/migrate.ts", ["up"], {
    DATABASE_URL: experimentDatabaseUrl.toString(),
  });

  for (const scenario of scenarios) {
    for (let repetition = 1; repetition <= repetitions; repetition++) {
      const started = performance.now();
      const output = await runScenario(scenario, repetition);
      console.log(
        `[OK] ${scenario.id} rep ${repetition}/${repetitions} em ${round((performance.now() - started) / 1000, 1)}s -> ${path.relative(projectRoot, output)}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
