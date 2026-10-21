import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("idempotency_keys").addColumn("lock_token", "uuid").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("idempotency_keys").dropColumn("lock_token").execute();
}
