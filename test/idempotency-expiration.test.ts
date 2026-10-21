import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/api/server.js";
import { db } from "../src/db/connection.js";
import { closeConnection, getChannel } from "../src/queue/connection.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../src/queue/topology.js";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  hashRequestBody,
  releaseIdempotencyKey,
} from "../src/services/idempotency.service.js";

async function expireKey(key: string) {
  await db
    .updateTable("idempotency_keys")
    .set({ expires_at: sql<Date>`now() - interval '1 second'` })
    .where("key", "=", key)
    .execute();
}

async function findKey(key: string) {
  return db.selectFrom("idempotency_keys").selectAll().where("key", "=", key).executeTakeFirst();
}

describe("Idempotency key expiration", () => {
  const keys: string[] = [];
  const paymentIds: string[] = [];

  beforeAll(async () => {
    await assertTopology(await getChannel());
  });

  afterEach(async () => {
    if (keys.length > 0) {
      await db.deleteFrom("idempotency_keys").where("key", "in", keys).execute();
      keys.length = 0;
    }
    if (paymentIds.length > 0) {
      await db
        .deleteFrom("outbox_messages")
        .where(sql<string>`payload->>'paymentId'`, "in", paymentIds)
        .execute();
      await db.deleteFrom("payment_events").where("payment_id", "in", paymentIds).execute();
      await db.deleteFrom("payments").where("id", "in", paymentIds).execute();
      paymentIds.length = 0;
    }
    await (await getChannel()).purgeQueue(PAYMENTS_PROCESS_QUEUE);
  });

  afterAll(async () => {
    await closeConnection();
    await db.destroy();
  });

  it("keeps rejecting a key that is still IN_PROGRESS and not expired with 409", async () => {
    const key = randomUUID();
    keys.push(key);
    const claim = await claimIdempotencyKey(key, hashRequestBody("10.00", "BRL"));
    expect(claim.outcome).toBe("claimed");

    const res = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "10.00", currency: "BRL" });

    expect(res.status).toBe(409);
  });

  it("takes over a key left IN_PROGRESS by a crashed request once its lock expires", async () => {
    const key = randomUUID();
    keys.push(key);
    await claimIdempotencyKey(key, hashRequestBody("10.00", "BRL"));
    await expireKey(key);

    const res = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "10.00", currency: "BRL" });

    expect(res.status).toBe(202);
    paymentIds.push(res.body.id);
    await expect.poll(async () => (await findKey(key))?.status).toBe("COMPLETED");
    expect((await findKey(key))?.payment_id).toBe(res.body.id);
  });

  it("treats a COMPLETED key as new again after it expires", async () => {
    const key = randomUUID();
    keys.push(key);
    const first = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "10.00", currency: "BRL" });
    paymentIds.push(first.body.id);
    await expect.poll(async () => (await findKey(key))?.status).toBe("COMPLETED");
    await expireKey(key);

    const second = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "25.00", currency: "BRL" });

    expect(second.status).toBe(202);
    paymentIds.push(second.body.id);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it("stores a 24h retention window when a key is completed", async () => {
    const key = randomUUID();
    keys.push(key);
    const res = await request(app)
      .post("/payments")
      .set("Idempotency-Key", key)
      .send({ amount: "10.00", currency: "BRL" });
    paymentIds.push(res.body.id);
    await expect.poll(async () => (await findKey(key))?.status).toBe("COMPLETED");

    const row = await findKey(key);
    const hoursLeft = ((row?.expires_at.getTime() ?? 0) - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(23);
  });

  it("does not let a slow request overwrite a key that was taken over after expiring", async () => {
    const key = randomUUID();
    keys.push(key);
    const hash = hashRequestBody("10.00", "BRL");
    const slow = await claimIdempotencyKey(key, hash);
    await expireKey(key);
    const takeover = await claimIdempotencyKey(key, hash);
    if (slow.outcome !== "claimed" || takeover.outcome !== "claimed") {
      throw new Error("both claims should have succeeded");
    }

    expect(await completeIdempotencyKey(key, slow.lockToken, randomUUID(), {})).toBe(false);
    expect(await releaseIdempotencyKey(key, slow.lockToken)).toBe(false);
    const row = await findKey(key);
    expect(row?.status).toBe("IN_PROGRESS");
    expect(row?.lock_token).toBe(takeover.lockToken);
  });
});
