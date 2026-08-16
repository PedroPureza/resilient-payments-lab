import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { env } from "../shared/env";
import type { Database } from "./types";

/**
 * Instância única do Kysely para a aplicação inteira, sobre um pool de
 * conexões `pg`. `Database` (src/db/types.ts) é o que dá autocomplete e
 * checagem de tipos nas queries — mas o SQL que roda no Postgres continua
 * explícito nas chamadas do Kysely (`.selectFrom(...)`, `.where(...)`), não
 * escondido atrás de um ORM.
 */
const dialect = new PostgresDialect({
  pool: new Pool({ connectionString: env.databaseUrl }),
});

export const db = new Kysely<Database>({ dialect });
