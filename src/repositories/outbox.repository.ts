import { type Kysely, sql } from "kysely";
import { db } from "../db/connection.js";
import type { Database } from "../db/types.js";

export function insertOutboxMessage(
  queue: string,
  payload: unknown,
  executor: Kysely<Database> = db,
) {
  return executor
    .insertInto("outbox_messages")
    .values({ queue, payload, published_at: null })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function markOutboxMessagesPublished(ids: string[], executor: Kysely<Database> = db) {
  return executor
    .updateTable("outbox_messages")
    .set({ published_at: sql<Date>`now()` })
    .where("id", "in", ids)
    .where("published_at", "is", null)
    .execute();
}

export function lockUnpublishedOutboxMessages(
  executor: Kysely<Database>,
  minAgeMs: number,
  limit: number,
) {
  return executor
    .selectFrom("outbox_messages")
    .selectAll()
    .where("published_at", "is", null)
    .where("created_at", "<", sql<Date>`now() - ${minAgeMs} * interval '1 millisecond'`)
    .orderBy("created_at")
    .limit(limit)
    .forUpdate()
    .skipLocked()
    .execute();
}
