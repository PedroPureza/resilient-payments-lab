import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FileMigrationProvider, Migrator } from "kysely";
import { db } from "./connection.js";

const migrationFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

const windowsSafeDynamicImportPath = {
  join: (...segments: string[]) => pathToFileURL(path.join(...segments)).href,
};

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({ fs, path: windowsSafeDynamicImportPath, migrationFolder }),
});

async function run(direction: "up" | "down") {
  const { error, results } =
    direction === "up" ? await migrator.migrateToLatest() : await migrator.migrateDown();

  for (const result of results ?? []) {
    const mark = result.status === "Success" ? "OK" : result.status === "Error" ? "FAIL" : "SKIP";
    console.log(`[${mark}] ${result.migrationName}`);
  }

  if (error) {
    console.error(error);
    process.exitCode = 1;
  }

  await db.destroy();
}

const direction = process.argv[2] === "down" ? "down" : "up";
run(direction);
