import { sql } from "kysely";
import { db } from "../db/connection.js";

export interface ClaimIdempotencyKeyInput {
  key: string;
  requestHash: string;
  lockToken: string;
  lockTimeoutMs: number;
}

function nowPlus(ms: number) {
  return sql<Date>`now() + ${ms} * interval '1 millisecond'`;
}

export function insertOrTakeOverExpiredIdempotencyKey(input: ClaimIdempotencyKeyInput) {
  const claimedRow = {
    request_hash: input.requestHash,
    payment_id: null,
    status: "IN_PROGRESS" as const,
    cached_response: null,
    expires_at: nowPlus(input.lockTimeoutMs),
    lock_token: input.lockToken,
  };
  return db
    .insertInto("idempotency_keys")
    .values({ key: input.key, ...claimedRow })
    .onConflict((oc) =>
      oc
        .column("key")
        .doUpdateSet({ ...claimedRow, created_at: sql`now()` })
        .where("idempotency_keys.expires_at", "<", sql<Date>`now()`),
    )
    .returning("key")
    .executeTakeFirst();
}

export function findIdempotencyKeyByKey(key: string) {
  return db.selectFrom("idempotency_keys").selectAll().where("key", "=", key).executeTakeFirst();
}

export function completeIdempotencyKey(
  key: string,
  lockToken: string,
  paymentId: string,
  cachedResponse: unknown,
  ttlMs: number,
) {
  return db
    .updateTable("idempotency_keys")
    .set({
      status: "COMPLETED",
      payment_id: paymentId,
      cached_response: cachedResponse,
      expires_at: nowPlus(ttlMs),
    })
    .where("key", "=", key)
    .where("lock_token", "=", lockToken)
    .executeTakeFirst();
}

export function deleteIdempotencyKey(key: string, lockToken: string) {
  return db
    .deleteFrom("idempotency_keys")
    .where("key", "=", key)
    .where("lock_token", "=", lockToken)
    .executeTakeFirst();
}
