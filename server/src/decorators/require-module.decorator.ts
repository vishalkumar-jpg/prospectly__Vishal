import { SetMetadata } from "@nestjs/common";
import { UserModule } from "modules/module-access/module-access.service";

export const REQUIRE_MODULE_KEY = "requireModule";

/**
 * Marks a controller/handler as requiring access to a specific application
 * module. Enforced by the global `ModuleAccessGuard`.
 */
export const RequireModule = (module: UserModule) =>
  SetMetadata(REQUIRE_MODULE_KEY, module);
