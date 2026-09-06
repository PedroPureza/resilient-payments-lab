import { db } from "../db/connection.js";
import type { PaymentStatus } from "../db/types.js";

export interface InsertPaymentInput {
  amount: string;
  currency: string;
}

export function insertPendingPayment(input: InsertPaymentInput) {
  return db
    .insertInto("payments")
    .values({ amount: input.amount, currency: input.currency, status: "PENDING" })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findPaymentById(id: string) {
  return db.selectFrom("payments").selectAll().where("id", "=", id).executeTakeFirst();
}

export function updatePaymentStatus(id: string, status: PaymentStatus) {
  return db
    .updateTable("payments")
    .set({ status, updated_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}
