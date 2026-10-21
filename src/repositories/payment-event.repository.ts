import type { Kysely } from "kysely";
import { db } from "../db/connection.js";
import type { Database } from "../db/types.js";

export type PaymentEventType =
  | "CREATED"
  | "PROCESSING"
  | "FAILED_ATTEMPT"
  | "RETRY_SCHEDULED"
  | "APPROVED"
  | "FAILED"
  | "MOVED_TO_DLQ";

export function recordPaymentEvent(
  paymentId: string,
  type: PaymentEventType,
  payload: unknown,
  executor: Kysely<Database> = db,
) {
  return executor
    .insertInto("payment_events")
    .values({ payment_id: paymentId, type, payload })
    .returningAll()
    .executeTakeFirstOrThrow();
}
