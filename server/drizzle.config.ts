import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";
import { getOsEnv } from "./src/config/env.config";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema/index.ts",
  out: "./src/migrations",
  dbCredentials: {
    url: getOsEnv("DATABASE_URL"),
  },
  schemaFilter: ["prospectly"],
});
