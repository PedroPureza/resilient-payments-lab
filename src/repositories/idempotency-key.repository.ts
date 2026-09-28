import { db } from "../db/connection.js";

export interface InsertInProgressIdempotencyKeyInput {
  key: string;
  requestHash: string;
  expiresAt: Date;
}

export function insertInProgressIdempotencyKey(input: InsertInProgressIdempotencyKeyInput) {
  return db
    .insertInto("idempotency_keys")
    .values({
      key: input.key,
      request_hash: input.requestHash,
      payment_id: null,
      status: "IN_PROGRESS",
      cached_response: null,
      expires_at: input.expiresAt,
    })
    .execute();
}

export function findIdempotencyKeyByKey(key: string) {
  return db.selectFrom("idempotency_keys").selectAll().where("key", "=", key).executeTakeFirst();
}

export function completeIdempotencyKey(key: string, paymentId: string, cachedResponse: unknown) {
  return db
    .updateTable("idempotency_keys")
    .set({ status: "COMPLETED", payment_id: paymentId, cached_response: cachedResponse })
    .where("key", "=", key)
    .execute();
}

export function deleteIdempotencyKey(key: string) {
  return db.deleteFrom("idempotency_keys").where("key", "=", key).execute();
}
