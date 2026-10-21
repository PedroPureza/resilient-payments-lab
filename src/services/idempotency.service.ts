import { createHash, randomUUID } from "node:crypto";
import {
  deleteIdempotencyKey,
  findIdempotencyKeyByKey,
  insertOrTakeOverExpiredIdempotencyKey,
  completeIdempotencyKey as completeIdempotencyKeyRepository,
} from "../repositories/idempotency-key.repository.js";
import { env } from "../shared/env.js";

export type IdempotencyClaimResult =
  | { outcome: "claimed"; lockToken: string }
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
  const lockToken = randomUUID();
  const claimed = await insertOrTakeOverExpiredIdempotencyKey({
    key,
    requestHash,
    lockToken,
    lockTimeoutMs: env.idempotencyLockTimeoutMs,
  });
  if (claimed) {
    return { outcome: "claimed", lockToken };
  }

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

export async function completeIdempotencyKey(
  key: string,
  lockToken: string,
  paymentId: string,
  response: unknown,
): Promise<boolean> {
  const result = await completeIdempotencyKeyRepository(
    key,
    lockToken,
    paymentId,
    response,
    env.idempotencyKeyTtlMs,
  );
  return result.numUpdatedRows > 0n;
}

export async function releaseIdempotencyKey(key: string, lockToken: string): Promise<boolean> {
  const result = await deleteIdempotencyKey(key, lockToken);
  return result.numDeletedRows > 0n;
}
