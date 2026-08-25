import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("idempotency_keys")
    .addColumn("key", "varchar(255)", (col) => col.primaryKey())
    .addColumn("request_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("payment_id", "uuid", (col) => col.notNull().references("payments.id"))
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("IN_PROGRESS"))
    .addColumn("cached_response", "jsonb", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("idempotency_keys").execute();
}
