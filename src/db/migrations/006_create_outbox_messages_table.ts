import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("outbox_messages")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("queue", "varchar(255)", (col) => col.notNull())
    .addColumn("payload", "jsonb", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("published_at", "timestamptz")
    .execute();
  await db.schema
    .createIndex("outbox_messages_unpublished_idx")
    .on("outbox_messages")
    .column("created_at")
    .where(sql.ref("published_at"), "is", null)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("outbox_messages").execute();
}
