import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/api/server.js";
import { db } from "../src/db/connection.js";
import { getChannel } from "../src/queue/connection.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../src/queue/topology.js";

describe("Idempotency (POST /payments)", () => {
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
      await db.deleteFrom("payments").where("id", "in", paymentIds).execute();
      paymentIds.length = 0;
    }
    const channel = await getChannel();
    await channel.purgeQueue(PAYMENTS_PROCESS_QUEUE);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("rejects a request without an Idempotency-Key header with 400", async () => {
    const res = await request(app).post("/payments").send({ amount: "10.00", currency: "BRL" });

    expect(res.status).toBe(400);
  });

  it("creates only one payment and replays the same response when the same key is sent twice", async () => {
    const key = randomUUID();
    keys.push(key);
    const body = { amount: "20.00", currency: "BRL" };

    const first = await request(app).post("/payments").set("Idempotency-Key", key).send(body);
    expect(first.status).toBe(202);
    paymentIds.push(first.body.id);

    const second = await request(app).post("/payments").set("Idempotency-Key", key).send(body);

    expect(second.status).toBe(202);
    expect(second.body).toEqual(first.body);

    const row = await db
      .selectFrom("idempotency_keys")
      .selectAll()
      .where("key", "=", key)
      .executeTakeFirstOrThrow();
    expect(row.status).toBe("COMPLETED");
    expect(row.payment_id).toBe(first.body.id);
  });

  it("rejects a reused key with a different request body with 422", async () => {
    const key = randomUUID();
    keys.push(key);

    const first = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "10.00", currency: "BRL" });
    paymentIds.push(first.body.id);

    const second = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "99.00", currency: "BRL" });

    expect(second.status).toBe(422);
  });

  it("never creates two payments when two requests race on the same key", async () => {
    const key = randomUUID();
    keys.push(key);
    const body = { amount: "15.00", currency: "USD" };

    const [first, second] = await Promise.all([
      request(app).post("/payments").set("Idempotency-Key", key).send(body),
      request(app).post("/payments").set("Idempotency-Key", key).send(body),
    ]);

    for (const res of [first, second]) {
      expect([202, 409]).toContain(res.status);
    }

    const createdPaymentIds = new Set(
      [first, second].filter((res) => res.status === 202).map((res) => res.body.id),
    );
    expect(createdPaymentIds.size).toBe(1);
    for (const id of createdPaymentIds) {
      paymentIds.push(id);
    }
  });

  it("releases the key after a validation error so a corrected retry can succeed", async () => {
    const key = randomUUID();
    keys.push(key);

    const invalid = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "not-a-number", currency: "BRL" });
    expect(invalid.status).toBe(400);

    const retry = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "10.00", currency: "BRL" });

    expect(retry.status).toBe(202);
    paymentIds.push(retry.body.id);
  });
});
