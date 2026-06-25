import postgres from "postgres";

declare global {
  var postgresSql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.postgresSql ??
  postgres(process.env.DATABASE_URL ?? "", {
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.postgresSql = sql;
}
