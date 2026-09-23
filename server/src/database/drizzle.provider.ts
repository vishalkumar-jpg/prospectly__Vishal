import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "database/schema";

export const DRIZZLE_TOKEN = "DRIZZLE_DB";

export const drizzleProvider: Provider = {
  provide: DRIZZLE_TOKEN,
  useFactory: (configService: ConfigService) => {
    let connectionString = configService.get<string>("DATABASE_URL");
    if (!connectionString) {
      throw new Error("DATABASE_URL is not defined");
    }

    // Append search_path to connection string to set default schema
    // Handle both postgres:// and postgresql:// URLs
    const separator = connectionString.includes("?") ? "&" : "?";
    connectionString = `${connectionString}${separator}search_path=prospectly`;

    const client = postgres(connectionString, {
      //   ssl: "require",
    });

    return drizzle(client, { schema });
  },
  inject: [ConfigService],
};
