import { createHash } from "node:crypto";
import {
  deleteIdempotencyKey,
  findIdempotencyKeyByKey,
  insertInProgressIdempotencyKey,
  completeIdempotencyKey as completeIdempotencyKeyRepository,
} from "../repositories/idempotency-key.repository.js";

export type IdempotencyClaimResult =
  | { outcome: "claimed" }
  | { outcome: "replay"; cachedResponse: unknown }
  | { outcome: "in_progress" }
  | { outcome: "mismatch" };

export function hashRequestBody(amount: string, currency: string): string {
  return createHash("sha256").update(`${amount}|${currency}`).digest("hex");
}

export async function claimIdempotencyKey(
  key: string,
  requestHash: string,
): Promise<IdempotencyClaimResult> {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  try {
    await insertInProgressIdempotencyKey({ key, requestHash, expiresAt });
    return { outcome: "claimed" };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const row = await findIdempotencyKeyByKey(key);
      if (!row) {
        return { outcome: "in_progress" };
      }
      if (row.request_hash !== requestHash) {
        return { outcome: "mismatch" };
      }
      if (row.status === "COMPLETED") {
        return { outcome: "replay", cachedResponse: row.cached_response };
      }
      return { outcome: "in_progress" };
    }
    throw error;
  }
}

export async function completeIdempotencyKey(
  key: string,
  paymentId: string,
  response: unknown,
): Promise<void> {
  await completeIdempotencyKeyRepository(key, paymentId, response);
}

export async function releaseIdempotencyKey(key: string): Promise<void> {
  await deleteIdempotencyKey(key);
}
