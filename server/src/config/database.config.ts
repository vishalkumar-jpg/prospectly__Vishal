import { registerAs } from "@nestjs/config";
import { getOsEnv } from "config/env.config";

export default registerAs("database", () => ({
  url: getOsEnv("DATABASE_URL"),
  ssl: getOsEnv("NODE_ENV") === "production",
}));
