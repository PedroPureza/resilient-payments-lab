import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/api/server.js";
import { db } from "../src/db/connection.js";
import { closeConnection, getChannel } from "../src/queue/connection.js";
import {
  assertTopology,
  PAYMENTS_DEAD_LETTER_QUEUE,
  PAYMENTS_PROCESS_QUEUE,
  retryQueueName,
} from "../src/queue/topology.js";
import { type ChaosConfig, SimulatedFailureError } from "../src/worker/chaos/failure-simulator.js";
import { startWorker } from "../src/worker/consumer.js";
import { processPayment } from "../src/worker/payment-processor.js";
import { retryDelays, type RetryPolicy } from "../src/worker/retry-policy.js";

const fastRetryPolicy: RetryPolicy = { maxAttempts: 3, baseDelayMs: 50 };
const alwaysFail: ChaosConfig = { failureRate: 1, modes: ["exception"], timeoutMs: 0 };
const neverFail: ChaosConfig = { failureRate: 0, modes: ["exception"], timeoutMs: 0 };

async function createPayment(): Promise<string> {
  const res = await request(app)
    .post("/payments")
    .set("Idempotency-Key", randomUUID())
    .send({ amount: "30.00", currency: "BRL" });
  expect(res.status).toBe(202);
  return res.body.id;
}

async function waitForFinalStatus(paymentId: string, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payment = await db
      .selectFrom("payments")
      .selectAll()
      .where("id", "=", paymentId)
      .executeTakeFirstOrThrow();
    if (payment.status !== "PENDING") {
      return payment;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`payment ${paymentId} still PENDING after ${timeoutMs}ms`);
}

async function eventTypes(paymentId: string): Promise<string[]> {
  const events = await db
    .selectFrom("payment_events")
    .select("type")
    .where("payment_id", "=", paymentId)
    .orderBy("created_at")
    .execute();
  return events.map((event) => event.type);
}

async function purgeQueues() {
  const channel = await getChannel();
  await channel.purgeQueue(PAYMENTS_PROCESS_QUEUE);
  await channel.purgeQueue(PAYMENTS_DEAD_LETTER_QUEUE);
}

describe("Retry with backoff and dead-letter queue", () => {
  const paymentIds: string[] = [];

  beforeAll(async () => {
    await assertTopology(await getChannel());
  });

  beforeEach(purgeQueues);

  afterEach(async () => {
    await purgeQueues();
    if (paymentIds.length > 0) {
      await db.deleteFrom("idempotency_keys").where("payment_id", "in", paymentIds).execute();
      await db.deleteFrom("payment_events").where("payment_id", "in", paymentIds).execute();
      await db.deleteFrom("payments").where("id", "in", paymentIds).execute();
      paymentIds.length = 0;
    }
  });

  afterAll(async () => {
    const channel = await getChannel();
    for (const delayMs of retryDelays(fastRetryPolicy)) {
      await channel.deleteQueue(retryQueueName(delayMs));
    }
    await closeConnection();
    await db.destroy();
  });

  it("retries with backoff, then marks FAILED and moves the message to the DLQ", async () => {
    const worker = await startWorker({ chaos: alwaysFail, retryPolicy: fastRetryPolicy });
    try {
      const paymentId = await createPayment();
      paymentIds.push(paymentId);

      const payment = await waitForFinalStatus(paymentId);

      expect(payment.status).toBe("FAILED");
      expect(payment.attempts).toBe(3);
      expect(await eventTypes(paymentId)).toEqual([
        "CREATED",
        "PROCESSING",
        "FAILED_ATTEMPT",
        "RETRY_SCHEDULED",
        "PROCESSING",
        "FAILED_ATTEMPT",
        "RETRY_SCHEDULED",
        "PROCESSING",
        "FAILED_ATTEMPT",
        "FAILED",
        "MOVED_TO_DLQ",
      ]);

      const retryDelaysRecorded = await db
        .selectFrom("payment_events")
        .select("payload")
        .where("payment_id", "=", paymentId)
        .where("type", "=", "RETRY_SCHEDULED")
        .orderBy("created_at")
        .execute();
      expect(
        retryDelaysRecorded.map((event) => (event.payload as { delayMs: number }).delayMs),
      ).toEqual([50, 200]);

      const deadLetter = await (
        await getChannel()
      ).get(PAYMENTS_DEAD_LETTER_QUEUE, { noAck: true });
      expect(deadLetter).not.toBe(false);
      if (deadLetter) {
        expect(JSON.parse(deadLetter.content.toString())).toMatchObject({ paymentId, attempts: 3 });
      }
    } finally {
      await worker.stop();
    }
  });

  it("approves a payment that recovers on a later attempt", async () => {
    let calls = 0;
    const worker = await startWorker({
      chaos: neverFail,
      retryPolicy: fastRetryPolicy,
      simulate: async () => {
        calls++;
        if (calls < 3) {
          throw new SimulatedFailureError("unavailable", "scripted failure");
        }
      },
    });
    try {
      const paymentId = await createPayment();
      paymentIds.push(paymentId);

      const payment = await waitForFinalStatus(paymentId);

      expect(payment.status).toBe("APPROVED");
      expect(payment.attempts).toBe(3);
      const types = await eventTypes(paymentId);
      expect(types.filter((type) => type === "FAILED_ATTEMPT")).toHaveLength(2);
      expect(types.at(-1)).toBe("APPROVED");
      expect(types).not.toContain("MOVED_TO_DLQ");
    } finally {
      await worker.stop();
    }
  });

  it("skips a redelivered message for a payment that is already final", async () => {
    const paymentId = await createPayment();
    paymentIds.push(paymentId);
    const dependencies = {
      channel: await getChannel(),
      chaos: neverFail,
      retryPolicy: fastRetryPolicy,
    };

    expect(await processPayment({ paymentId }, dependencies)).toBe("approved");
    expect(await processPayment({ paymentId }, dependencies)).toBe("skipped");

    const payment = await waitForFinalStatus(paymentId);
    expect(payment.attempts).toBe(1);
  });

  it("processes up to prefetch messages at the same time", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const worker = await startWorker({
      chaos: neverFail,
      retryPolicy: fastRetryPolicy,
      prefetch: 5,
      simulate: async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 200));
        inFlight--;
      },
    });
    try {
      const ids = await Promise.all(Array.from({ length: 5 }, () => createPayment()));
      paymentIds.push(...ids);

      for (const id of ids) {
        expect((await waitForFinalStatus(id)).status).toBe("APPROVED");
      }
      expect(maxInFlight).toBeGreaterThan(1);
      expect(maxInFlight).toBeLessThanOrEqual(5);
    } finally {
      await worker.stop();
    }
  });
});
