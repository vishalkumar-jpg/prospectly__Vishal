import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "decorators/public.decorator";
import { SKIP_CSRF_KEY } from "decorators/skip-csrf.decorator";
import { appConfig } from "config/app.config";

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Skip CSRF validation for safe HTTP methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(request.method)) {
      return true;
    }

    // Skip CSRF validation for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      handler,
      controller,
    ]);
    if (isPublic) {
      return true;
    }

    // Skip CSRF validation for routes explicitly marked with @SkipCSRF()
    const skipCSRF = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      handler,
      controller,
    ]);
    if (skipCSRF) {
      return true;
    }

    // Skip CSRF validation for webhook endpoints
    const path = request.path || request.url;
    if (path.includes("/webhooks/")) {
      return true;
    }

    // Extract CSRF token from header (Express normalizes headers to lowercase)
    const headerToken =
      (request.headers["x-csrf-token"] as string | undefined) ||
      (request.headers["X-CSRF-Token"] as string | undefined);

    // Extract CSRF token from cookie
    const cookieToken = request.cookies?.[appConfig.cookieNames.csrfToken] as
      | string
      | undefined;

    // Validate CSRF token
    if (!headerToken || !cookieToken) {
      throw new ForbiddenException(
        "CSRF token is missing. Please ensure X-CSRF-Token header is included in your request."
      );
    }

    // Compare tokens (case-sensitive)
    if (headerToken !== cookieToken) {
      throw new ForbiddenException(
        "CSRF token validation failed. The token in the header does not match the token in the cookie."
      );
    }

    return true;
  }
}
