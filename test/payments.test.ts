import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/api/server.js";
import { db } from "../src/db/connection.js";
import { getChannel } from "../src/queue/connection.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../src/queue/topology.js";
import { type PaymentProcessMessage, processPayment } from "../src/worker/payment-processor.js";

describe("Payments API", () => {
  const paymentIds: string[] = [];
  const keys: string[] = [];

  beforeAll(async () => {
    const channel = await getChannel();
    await assertTopology(channel);
  });

  afterEach(async () => {
    if (keys.length > 0) {
      await db.deleteFrom("idempotency_keys").where("key", "in", keys).execute();
      keys.length = 0;
    }
    if (paymentIds.length > 0) {
      await db.deleteFrom("payment_events").where("payment_id", "in", paymentIds).execute();
      await db.deleteFrom("payments").where("id", "in", paymentIds).execute();
      paymentIds.length = 0;
    }
    const channel = await getChannel();
    await channel.purgeQueue(PAYMENTS_PROCESS_QUEUE);
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("POST /payments", () => {
    it("creates a payment as PENDING, publishes it, and processPayment approves it", async () => {
      const key = randomUUID();
      keys.push(key);
      const res = await request(app)
        .post("/payments")
        .set("Idempotency-Key", key)
        .send({ amount: "42.50", currency: "BRL" });

      expect(res.status).toBe(202);
      expect(res.body).toMatchObject({
        amount: "42.50",
        currency: "BRL",
        status: "PENDING",
        attempts: 0,
      });
      expect(res.body.id).toBeTruthy();
      paymentIds.push(res.body.id);

      const channel = await getChannel();
      const message = await new Promise((resolve) => {
        channel.consume(PAYMENTS_PROCESS_QUEUE, (msg) => {
          if (!msg) {
            return;
          }
          channel.ack(msg);
          resolve(JSON.parse(msg.content.toString()));
        });
      });
      expect(message).toEqual({ paymentId: res.body.id });

      await processPayment(message as PaymentProcessMessage, {
        channel,
        chaos: { failureRate: 0, modes: ["exception"], timeoutMs: 0 },
        retryPolicy: { maxAttempts: 1, baseDelayMs: 1000 },
      });

      const approved = await request(app).get(`/payments/${res.body.id}`);
      expect(approved.body.status).toBe("APPROVED");
    });

    it("rejects an invalid amount with 400", async () => {
      const res = await request(app)
        .post("/payments")
        .set("Idempotency-Key", randomUUID())
        .send({ amount: "free", currency: "BRL" });

      expect(res.status).toBe(400);
    });

    it("rejects an invalid currency with 400", async () => {
      const res = await request(app)
        .post("/payments")
        .set("Idempotency-Key", randomUUID())
        .send({ amount: "10.00", currency: "reais" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /payments/:id", () => {
    it("returns the payment created previously", async () => {
      const key = randomUUID();
      keys.push(key);
      const created = await request(app)
        .post("/payments")
        .set("Idempotency-Key", key)
        .send({ amount: "10.00", currency: "USD" });
      paymentIds.push(created.body.id);

      const res = await request(app).get(`/payments/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: created.body.id, amount: "10.00", currency: "USD" });
    });

    it("returns 404 for a well-formed id that does not exist", async () => {
      const res = await request(app).get(`/payments/${randomUUID()}`);

      expect(res.status).toBe(404);
    });

    it("returns 400 for a malformed id", async () => {
      const res = await request(app).get("/payments/not-a-uuid");

      expect(res.status).toBe(400);
    });
  });
});
