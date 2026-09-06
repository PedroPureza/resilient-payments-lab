import { db } from "../db/connection.js";

export type PaymentEventType =
  | "CREATED"
  | "PROCESSING"
  | "FAILED_ATTEMPT"
  | "RETRY_SCHEDULED"
  | "APPROVED"
  | "FAILED"
  | "MOVED_TO_DLQ";

export function recordPaymentEvent(paymentId: string, type: PaymentEventType, payload: unknown) {
  return db
    .insertInto("payment_events")
    .values({ payment_id: paymentId, type, payload })
    .returningAll()
    .executeTakeFirstOrThrow();
}
