import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { RECRUITMENT_PERMISSIONS } from "modules/recruitment/collaboration/recruitment-collaboration.constants";
import { createCollaboratorJobIdsSubquery } from "modules/recruitment/recruiter-dashboard/utils/recruiter-dashboard-job-scope.utils";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

/**
 * The single answer to "which postings can this user search?".
 *
 * Everything about row visibility in cross-job search reduces to this list plus
 * the one CTE branch that consumes it. No handler builds its own visibility SQL
 * (ADR-005 §3).
 */
@Injectable()
export class CandidateSearchScopeService {
  private readonly logger = new Logger(CandidateSearchScopeService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Owned postings, plus collaborated postings where the collaborator's role
   * holds `candidate.view`.
   *
   * Resolved per request and never cached: removing a collaborator or revoking
   * organisation membership has to take effect on the next call, and a cache is
   * exactly how that guarantee gets lost (ADR-004).
   *
   * Connectors are deliberately absent — they keep their per-job board.
   */
  async resolveAccessibleJobIds(userId: string): Promise<string[]> {
    const collaboratorJobIds = createCollaboratorJobIdsSubquery(
      this.db,
      userId,
      RECRUITMENT_PERMISSIONS.CANDIDATE_VIEW
    );

    const rows = await this.db
      .select({ id: schema.recruitmentJobsSchema.id })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          isNull(schema.recruitmentJobsSchema.deletedAt),
          or(
            eq(schema.recruitmentJobsSchema.requesterId, userId),
            inArray(schema.recruitmentJobsSchema.id, collaboratorJobIds)
          )
        )
      );

    return rows.map((row) => row.id);
  }

  /**
   * True when the user has no accessible postings at all.
   *
   * The caller must short-circuit on this rather than running the query: an
   * empty set makes `= ANY('{}')` match nothing, which is correct but reads like
   * a fault, and it lets the UI show "you don't have any job postings yet"
   * instead of "no candidates match" — a distinction a brand-new recruiter
   * feels sharply.
   */
  hasNoScope(jobIds: string[]): boolean {
    if (jobIds.length === 0) {
      this.logger.debug(
        "CANDIDATE_SEARCH_SCOPE :: resolveAccessibleJobIds : EMPTY_SCOPE"
      );
      return true;
    }
    return false;
  }
}
