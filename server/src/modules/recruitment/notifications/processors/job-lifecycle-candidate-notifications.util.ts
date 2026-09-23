import { Logger } from "@nestjs/common";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { formatUserFirstName } from "./recruitment-lifecycle-format.util";
import {
  isLifecycleRecipientEligible,
  sendLifecycleEmail,
} from "./recruitment-lifecycle-send.helper";
import {
  JOB_CLOSE_CANDIDATE_STAGE_KEYS,
  JOB_CLOSE_NOTIFY_ALL_STAGES,
} from "../../jobs/job-close-notification.constants";
import {
  buildCandidateApplicationsUrl,
  buildEmailPreferencesUrl,
  buildJobMarketplaceUrl,
} from "../recruitment-notification-urls.util";

type JobContext = {
  jobId: string;
  jobTitle: string;
  companyName: string;
};

function resolveCandidateStageFilter(stageKeys: string[]): string[] {
  if (!stageKeys.length) return [];
  if (stageKeys.includes(JOB_CLOSE_NOTIFY_ALL_STAGES)) {
    return [...JOB_CLOSE_CANDIDATE_STAGE_KEYS];
  }
  return stageKeys.filter((key) =>
    (JOB_CLOSE_CANDIDATE_STAGE_KEYS as readonly string[]).includes(key)
  );
}

export async function sendJobLifecycleCandidateNotifications(
  db: PostgresJsDatabase<typeof schema>,
  emailsService: EmailsService,
  emailLogsService: RecruitmentEmailLogsService,
  logger: Logger,
  ctx: JobContext,
  actorUserId: string,
  candidateStageKeys: string[],
  slug:
    | Slug.RecruitmentJobClosedCandidate
    | Slug.RecruitmentJobReopenedCandidate,
  logPrefix: string
): Promise<void> {
  const stageFilter = resolveCandidateStageFilter(candidateStageKeys);
  if (!stageFilter.length) return;

  const stageRows = await db
    .select({ id: schema.recruitmentStagesSchema.id })
    .from(schema.recruitmentStagesSchema)
    .where(inArray(schema.recruitmentStagesSchema.stageKey, stageFilter));

  const stageIds = stageRows.map((row) => row.id);
  if (!stageIds.length) return;

  const candidates = await db
    .select({
      candidateId: schema.recruitmentJobCandidates.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      isActive: schema.users.isActive,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.recruitmentJobCandidates)
    .innerJoin(
      schema.users,
      eq(schema.recruitmentJobCandidates.candidateUserId, schema.users.id)
    )
    .where(
      and(
        eq(schema.recruitmentJobCandidates.jobId, ctx.jobId),
        inArray(schema.recruitmentJobCandidates.stageId, stageIds),
        isNull(schema.recruitmentJobCandidates.deletedAt)
      )
    );

  const baseVars = {
    jobTitle: ctx.jobTitle,
    companyName: ctx.companyName,
  };

  for (const candidate of candidates) {
    const email = isLifecycleRecipientEligible(candidate);
    if (!email) continue;

    try {
      await sendLifecycleEmail(
        emailsService,
        logger,
        slug,
        email,
        {
          candidateName: formatUserFirstName(candidate),
          ...baseVars,
          applicationsUrl: buildCandidateApplicationsUrl(),
          jobMarketplaceUrl: buildJobMarketplaceUrl(),
          emailPreferencesUrl: buildEmailPreferencesUrl(),
        },
        `${logPrefix} :: SEND_CANDIDATE candidate=${candidate.candidateId}`,
        {
          log: {
            emailLogsService,
            jobId: ctx.jobId,
            candidateId: candidate.candidateId,
            poolMatchId: null,
            createdBy: actorUserId,
          },
        }
      );
    } catch {
      // sendLifecycleEmail already logged the failure
    }
  }
}
