import { Injectable, ExecutionContext, Inject } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "decorators/public.decorator";
import { IS_PUBLIC_IGNORE_JWT_KEY } from "decorators/public-ignore-jwt.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(@Inject(Reflector) private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip authentication for OPTIONS preflight requests (CORS)
    if (request.method === "OPTIONS") {
      return true;
    }

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

    return super.canActivate(context);
  }
}
