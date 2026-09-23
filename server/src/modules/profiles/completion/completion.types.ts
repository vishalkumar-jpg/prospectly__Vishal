import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";

type Database = PostgresJsDatabase<typeof schema>;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
