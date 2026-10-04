// The one Postgres client every route shares. Defaults to overdo-db's local docker compose database.
import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL ?? "postgres://overdo:overdo@localhost:5433/overdo");
