import type { Generated } from "kysely";

export interface Database {
  payments: PaymentsTable;
  idempotency_keys: IdempotencyKeysTable;
  payment_events: PaymentEventsTable;
}

export type PaymentStatus = "PENDING" | "APPROVED" | "FAILED";

export interface PaymentsTable {
  id: Generated<string>;
  amount: string;
  currency: string;
  status: Generated<PaymentStatus>;
  attempts: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface IdempotencyKeysTable {
  key: string;
  request_hash: string;
  payment_id: string | null;
  status: Generated<"IN_PROGRESS" | "COMPLETED">;
  cached_response: unknown;
  expires_at: Date;
  created_at: Generated<Date>;
}

export interface PaymentEventsTable {
  id: Generated<string>;
  payment_id: string;
  type: string;
  payload: unknown;
  created_at: Generated<Date>;
}
