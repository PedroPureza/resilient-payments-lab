import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("idempotency_keys")
    .alterColumn("payment_id", (col) => col.dropNotNull())
    .execute();
  await db.schema
    .alterTable("idempotency_keys")
    .alterColumn("cached_response", (col) => col.dropNotNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("idempotency_keys")
    .alterColumn("payment_id", (col) => col.setNotNull())
    .execute();
  await db.schema
    .alterTable("idempotency_keys")
    .alterColumn("cached_response", (col) => col.setNotNull())
    .execute();
}
