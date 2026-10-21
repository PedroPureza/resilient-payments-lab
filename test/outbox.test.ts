import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/db/connection.js";
import { closeConnection, getChannel } from "../src/queue/connection.js";
import { relayPendingOutboxMessages } from "../src/queue/outbox-relay.js";
import { assertTopology, PAYMENTS_PROCESS_QUEUE } from "../src/queue/topology.js";
import { createPayment } from "../src/services/payment.service.js";

async function insertStaleOutboxMessage(paymentId: string) {
  return db
    .insertInto("outbox_messages")
    .values({
      queue: PAYMENTS_PROCESS_QUEUE,
      payload: { paymentId },
      created_at: sql<Date>`now() - interval '1 minute'`,
      published_at: null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

async function drainProcessQueue(): Promise<unknown[]> {
  const channel = await getChannel();
  const messages: unknown[] = [];
  for (;;) {
    const msg = await channel.get(PAYMENTS_PROCESS_QUEUE, { noAck: true });
    if (!msg) {
      return messages;
    }
    messages.push(JSON.parse(msg.content.toString()));
  }
}

describe("Transactional outbox", () => {
  const outboxIds: string[] = [];
  const paymentIds: string[] = [];

  beforeAll(async () => {
    await assertTopology(await getChannel());
    await db
      .updateTable("outbox_messages")
      .set({ published_at: sql<Date>`now()` })
      .execute();
  });

  afterEach(async () => {
    await (await getChannel()).purgeQueue(PAYMENTS_PROCESS_QUEUE);
    if (outboxIds.length > 0) {
      await db.deleteFrom("outbox_messages").where("id", "in", outboxIds).execute();
      outboxIds.length = 0;
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
  });

  afterAll(async () => {
    await closeConnection();
    await db.destroy();
  });

  it("records the outbox message with the payment and marks it published after the fast path", async () => {
    const payment = await createPayment({ amount: "12.00", currency: "BRL" });
    paymentIds.push(payment.id);

    const outbox = await db
      .selectFrom("outbox_messages")
      .selectAll()
      .where(sql<string>`payload->>'paymentId'`, "=", payment.id)
      .execute();

    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.queue).toBe(PAYMENTS_PROCESS_QUEUE);
    expect(outbox[0]?.published_at).not.toBeNull();
    expect(await drainProcessQueue()).toContainEqual({ paymentId: payment.id });
  });

  it("relays a message whose fast-path publish never happened", async () => {
    const paymentId = randomUUID();
    const message = await insertStaleOutboxMessage(paymentId);
    outboxIds.push(message.id);

    const relayed = await relayPendingOutboxMessages({ minAgeMs: 5000, batchSize: 10 });

    expect(relayed).toBe(1);
    expect(await drainProcessQueue()).toEqual([{ paymentId }]);
    const row = await db
      .selectFrom("outbox_messages")
      .selectAll()
      .where("id", "=", message.id)
      .executeTakeFirstOrThrow();
    expect(row.published_at).not.toBeNull();
  });

  it("leaves recent unpublished messages to the fast path", async () => {
    const message = await db
      .insertInto("outbox_messages")
      .values({
        queue: PAYMENTS_PROCESS_QUEUE,
        payload: { paymentId: randomUUID() },
        published_at: null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    outboxIds.push(message.id);

    const relayed = await relayPendingOutboxMessages({ minAgeMs: 60_000, batchSize: 10 });

    expect(relayed).toBe(0);
    expect(await drainProcessQueue()).toEqual([]);
  });

  it("does not publish the same message twice when relays run concurrently", async () => {
    const paymentId = randomUUID();
    const message = await insertStaleOutboxMessage(paymentId);
    outboxIds.push(message.id);

    const [first, second] = await Promise.all([
      relayPendingOutboxMessages({ minAgeMs: 5000, batchSize: 10 }),
      relayPendingOutboxMessages({ minAgeMs: 5000, batchSize: 10 }),
    ]);

    expect(first + second).toBe(1);
    expect(await drainProcessQueue()).toEqual([{ paymentId }]);
  });
});
