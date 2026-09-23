import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "decorators/public.decorator";
import { IS_PUBLIC_IGNORE_JWT_KEY } from "decorators/public-ignore-jwt.decorator";
import { REQUIRE_MODULE_KEY } from "decorators/require-module.decorator";
import {
  ModuleAccessService,
  UserModule,
} from "modules/module-access/module-access.service";

export const MODULE_ACCESS_DENIED_CODE = "MODULE_ACCESS_DENIED";

/**
 * Global guard that enforces `@RequireModule(...)`. Routes without the
 * decorator are unaffected. Public (unauthenticated) routes are skipped so
 * token-based links inside gated controllers keep working.
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleAccessService: ModuleAccessService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip CORS preflight requests.
    if (request.method === "OPTIONS") {
      return true;
    }

    const requiredModule = this.reflector.getAllAndOverride<
      UserModule | undefined
    >(REQUIRE_MODULE_KEY, [context.getHandler(), context.getClass()]);

    // No module requirement declared — nothing to enforce.
    if (!requiredModule) {
      return true;
    }

    // Public routes have no authenticated user; module access cannot and
    // should not be enforced for them (e.g. token-based candidate links).
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublicIgnoreJwt = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_IGNORE_JWT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isPublic || isPublicIgnoreJwt) {
      return true;
    }

    const userId = (request as Request & { user?: { userId?: string } }).user
      ?.userId;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    const hasAccess = await this.moduleAccessService.hasModuleAccess(
      userId,
      requiredModule
    );

    if (!hasAccess) {
      throw new ForbiddenException({
        message: `You don't have access to the ${requiredModule} module.`,
        code: MODULE_ACCESS_DENIED_CODE,
      });
    }

    return true;
  }
}
