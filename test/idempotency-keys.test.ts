import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "../src/db/connection.js";

describe("idempotency_keys", () => {
  const paymentIds: string[] = [];
  const keys: string[] = [];

  afterEach(async () => {
    await db.deleteFrom("idempotency_keys").where("key", "in", keys).execute();
    await db.deleteFrom("payments").where("id", "in", paymentIds).execute();
    keys.length = 0;
    paymentIds.length = 0;
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("rejects a second row with a key that already exists", async () => {
    const payment = await db
      .insertInto("payments")
      .values({ amount: "10.00", currency: "BRL" })
      .returning("id")
      .executeTakeFirstOrThrow();
    paymentIds.push(payment.id);

    const key = randomUUID();
    keys.push(key);

    await db
      .insertInto("idempotency_keys")
      .values({
        key,
        payment_id: payment.id,
        request_hash: "hash-first-request",
        cached_response: { status: "PENDING" },
        expires_at: new Date(Date.now() + 60_000),
      })
      .execute();

    await expect(
      db
        .insertInto("idempotency_keys")
        .values({
          key,
          payment_id: payment.id,
          request_hash: "hash-second-request",
          cached_response: { status: "PENDING" },
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute(),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
