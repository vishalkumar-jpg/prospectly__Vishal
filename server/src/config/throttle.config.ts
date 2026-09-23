import { ThrottlerModuleOptions } from "@nestjs/throttler";
import { appConfig } from "./app.config";

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      ttl: appConfig.throttle.ttl,
      limit: appConfig.throttle.limit,
    },
  ],
};
