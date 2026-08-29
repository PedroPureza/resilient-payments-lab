import { db } from "../db/connection.js";

export interface InsertPaymentInput {
  amount: string;
  currency: string;
}

export function insertApprovedPayment(input: InsertPaymentInput) {
  return db
    .insertInto("payments")
    .values({ amount: input.amount, currency: input.currency, status: "APPROVED" })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findPaymentById(id: string) {
  return db.selectFrom("payments").selectAll().where("id", "=", id).executeTakeFirst();
}
