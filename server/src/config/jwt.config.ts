import { registerAs } from "@nestjs/config";
import { getOsEnv } from "config/env.config";

export default registerAs("jwt", () => ({
  accessTokenSecret: getOsEnv("JWT_SECRET"),
  refreshTokenSecret: getOsEnv("REFRESH_TOKEN_SECRET"),
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "30d",
}));
