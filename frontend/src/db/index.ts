import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

declare global {
  var __dbClient: postgres.Sql | undefined;
}

// `postgres()` connects lazily, so an unset/placeholder DATABASE_URL is fine here -
// it only surfaces as an error on the first real query. Keeping this non-throwing
// (unlike drizzle.config.ts) matters because `next build` imports every route
// module, including this one, during page-data collection - a hard throw here
// would make production builds require a live DB secret at build time.
const client = global.__dbClient ?? postgres(process.env.DATABASE_URL ?? "");

if (process.env.NODE_ENV !== "production") {
  global.__dbClient = client;
}

export const db = drizzle(client, { schema });
