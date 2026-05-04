import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  db: Db | undefined;
};

function getDb(): Db {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client =
    globalForDb.client ??
    postgres(connectionString, {
      max: 1,
      prepare: false,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.client = client;
  }

  globalForDb.db = drizzle(client, { schema });
  return globalForDb.db;
}

/** Lazy DB — avoids throwing at import time when DATABASE_URL is unset (e.g. analyze). */
export const db = new Proxy({} as Db, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    const value = instance[prop as keyof Db];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});
