import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { env } from "../shared/env.js";
import type { Database } from "./types.js";

const dialect = new PostgresDialect({
  pool: new Pool({ connectionString: env.databaseUrl }),
});

export const db = new Kysely<Database>({ dialect });
