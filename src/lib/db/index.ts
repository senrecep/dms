import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  db: Database | undefined;
  pgClient: postgres.Sql | undefined;
};

function createDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const client = postgres(url);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = client;
  }

  const database = drizzle(client, { schema });
  globalForDb.db = database;
  return database;
}

function getDb(): Database {
  if (!globalForDb.db) {
    return createDb();
  }
  return globalForDb.db;
}

// Lazy proxy — connection created on first use, not at import time
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    const value = Reflect.get(realDb, prop, receiver);
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});
