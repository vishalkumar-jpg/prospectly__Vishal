import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ResolvedJobAccess } from "modules/recruitment/collaboration/services/recruitment-access.service";

/**
 * Exposes the `ResolvedJobAccess` that `RecruitmentPermissionGuard` attached to
 * the request, so handlers reuse the guard's resolution instead of re-querying.
 * Only populated on routes decorated with `@RequirePermission(...)`.
 */
export const RecruitmentAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ResolvedJobAccess | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ recruitmentAccess?: ResolvedJobAccess }>();
    return request.recruitmentAccess;
  }
);
