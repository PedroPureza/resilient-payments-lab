export interface Scenario {
  id: string;
  description: string;
  idempotencyEnabled: boolean;
  failureRate: number;
  duplicateRate: number;
  maxAttempts: number;
  concurrency: number;
  totalRequests: number;
  retryBaseDelayMs: number;
  failureModes: string;
  chaosTimeoutMs: number;
  workerPrefetch: number;
}

const defaults = {
  idempotencyEnabled: true,
  failureRate: 0,
  duplicateRate: 0,
  maxAttempts: 4,
  concurrency: 20,
  totalRequests: 200,
  retryBaseDelayMs: 1000,
  failureModes: "exception,timeout,unavailable",
  chaosTimeoutMs: 300,
  workerPrefetch: 10,
};

function scenario(fields: Partial<Scenario> & Pick<Scenario, "id" | "description">): Scenario {
  return { ...defaults, ...fields };
}

export const SCENARIOS: Scenario[] = [
  scenario({
    id: "01-baseline",
    description: "Sem falha, sem duplicata, idempotência ligada",
  }),
  scenario({
    id: "02a-duplicacao-20-sem-idempotencia",
    description: "20% de requisições duplicadas, idempotência desligada",
    idempotencyEnabled: false,
    duplicateRate: 0.2,
  }),
  scenario({
    id: "02b-duplicacao-50-sem-idempotencia",
    description: "50% de requisições duplicadas, idempotência desligada",
    idempotencyEnabled: false,
    duplicateRate: 0.5,
  }),
  scenario({
    id: "03a-duplicacao-20-com-idempotencia",
    description: "20% de requisições duplicadas, idempotência ligada",
    duplicateRate: 0.2,
  }),
  scenario({
    id: "03b-duplicacao-50-com-idempotencia",
    description: "50% de requisições duplicadas, idempotência ligada",
    duplicateRate: 0.5,
  }),
  ...[0.1, 0.3, 0.5].flatMap((failureRate) => {
    const percent = Math.round(failureRate * 100);
    return [
      scenario({
        id: `04-falhas-${percent}-sem-retry`,
        description: `FAILURE_RATE=${failureRate}, sem retry (MAX_ATTEMPTS=1)`,
        failureRate,
        maxAttempts: 1,
      }),
      scenario({
        id: `05-falhas-${percent}-com-retry`,
        description: `FAILURE_RATE=${failureRate}, com retry (MAX_ATTEMPTS=4, backoff 1s/4s/16s)`,
        failureRate,
      }),
    ];
  }),
  ...[10, 50].map((concurrency) =>
    scenario({
      id: `06-estresse-concorrencia-${concurrency}`,
      description: `Estresse combinado: FAILURE_RATE=0.3, 50% duplicatas, idempotência e retry ligados, concorrência ${concurrency}`,
      failureRate: 0.3,
      duplicateRate: 0.5,
      concurrency,
    }),
  ),
];
