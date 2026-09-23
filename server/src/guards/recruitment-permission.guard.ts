import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isUUID } from "class-validator";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "decorators/public.decorator";
import { IS_PUBLIC_IGNORE_JWT_KEY } from "decorators/public-ignore-jwt.decorator";
import {
  REQUIRE_RECRUITMENT_PERMISSION_KEY,
  RequireRecruitmentPermissionMeta,
} from "decorators/require-recruitment-permission.decorator";
import {
  RecruitmentAccessService,
  ResolvedJobAccess,
} from "modules/recruitment/collaboration/services/recruitment-access.service";

/**
 * Global guard that enforces `@RequirePermission(...)` on recruitment routes.
 * Resolves the job (from a `jobId`/`candidateId` route param) via
 * RecruitmentAccessService, rejecting before the handler runs, and attaches the
 * resolved access to the request for handlers to reuse. Routes without the
 * decorator are unaffected; public routes are skipped.
 */
@Injectable()
export class RecruitmentPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessService: RecruitmentAccessService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.method === "OPTIONS") {
      return true;
    }

    const meta = this.reflector.getAllAndOverride<
      RequireRecruitmentPermissionMeta | undefined
    >(REQUIRE_RECRUITMENT_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission requirement declared — nothing to enforce.
    if (!meta) {
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

    const userId = (request as Request & { user?: { userId?: string } }).user
      ?.userId;
    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    const paramName =
      meta.param ?? (meta.from === "candidate" ? "candidateId" : "jobId");
    const resourceId = (request.params as Record<string, string | undefined>)[
      paramName
    ];
    // Guards run before validation pipes, so validate the id format here — a
    // malformed id can't reference a real resource (clean 404, not a DB error).
    if (!resourceId || !isUUID(resourceId)) {
      throw new NotFoundException("Resource not found");
    }

    let access: ResolvedJobAccess;
    if (meta.from === "candidate") {
      // Candidate routes always declare a concrete permission.
      access = await this.accessService.assertCandidatePermission(
        userId,
        resourceId,
        meta.permission!
      );
    } else if (meta.permission) {
      access = await this.accessService.assertPermission(
        userId,
        resourceId,
        meta.permission
      );
    } else {
      // "Any access" — owner or active collaborator (e.g. job detail).
      access = await this.accessService.resolveJobAccess(userId, resourceId);
    }

    (
      request as Request & { recruitmentAccess?: ResolvedJobAccess }
    ).recruitmentAccess = access;

    return true;
  }
}
