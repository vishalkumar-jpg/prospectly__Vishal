import { Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "database/schema";
import { appConfig } from "config/app.config";
import { EmailsService } from "modules/emails/emails.service";
import { Slug } from "modules/emails/emails.constants";
import { utcDayjs } from "utils/dayjs";
import {
  escapeHtml,
  renderTemplateWithVariables,
} from "modules/emails/templating";
import {
  logRecruitmentEmailSent,
  SLUG_TO_EMAIL_LOG_TYPE,
  SLUG_TO_RECIPIENT_TYPE,
  type PipelineEmailLogInput,
} from "modules/recruitment/email-logs/recruitment-email-log.helper";
import type { RecruitmentEmailLogsService } from "modules/recruitment/email-logs/recruitment-email-logs.service";
import { formatUserDisplayName } from "./recruitment-lifecycle-format.util";

export type LifecycleEmailLogContext = Omit<
  PipelineEmailLogInput,
  "emailType" | "recipientType" | "recipientEmail" | "subject" | "emailBody"
> & {
  emailLogsService: RecruitmentEmailLogsService;
};

export async function sendLifecycleEmail(
  emailsService: EmailsService,
  logger: Logger,
  slug: Slug,
  to: string,
  variables: Record<string, string | number | boolean>,
  logContext: string,
  options?: {
    cc?: string[];
    log?: LifecycleEmailLogContext;
  }
): Promise<void> {
  try {
    const template = await emailsService.findTemplateBySlug(slug);
    const rendered = renderTemplateWithVariables(template, {
      url: appConfig.frontendUrl,
      currentYear: utcDayjs().year(),
      ...variables,
    });
    const subject = rendered.subject.replace(/[\r\n]/g, " ").trim();
    const result = await emailsService.sendEmail({
      to,
      ...(options?.cc?.length ? { cc: options.cc } : {}),
      subject,
      html: rendered.html,
      slug,
    });

    if (!result.success) {
      throw new Error(result.error ?? "Failed to send lifecycle email");
    }

    const emailType = SLUG_TO_EMAIL_LOG_TYPE[slug];
    const recipientType = SLUG_TO_RECIPIENT_TYPE[slug];
    if (options?.log && emailType && recipientType) {
      await logRecruitmentEmailSent(
        options.log.emailLogsService,
        result.emailId,
        {
          jobId: options.log.jobId,
          candidateId: options.log.candidateId ?? null,
          poolMatchId: options.log.poolMatchId ?? null,
          emailType,
          recipientType,
          recipientEmail: to,
          subject,
          emailBody: rendered.html,
          createdBy: options.log.createdBy,
        }
      );
    }
  } catch (error) {
    logger.error(
      `RECRUITMENT_LIFECYCLE :: ${logContext} :: send failed: ${error}`
    );
    throw error;
  }
}

export function isLifecycleRecipientEligible(user: {
  email?: string | null;
  deletedAt?: Date | null;
  isActive?: boolean | null;
}): string | null {
  const email = user.email?.trim();
  if (!email || user.deletedAt || user.isActive === false) {
    return null;
  }
  return email;
}

export async function resolveUserEmail(
  db: PostgresJsDatabase<typeof schema>,
  userId: string
): Promise<string | null> {
  const [user] = await db
    .select({
      email: schema.users.email,
      isActive: schema.users.isActive,
      deletedAt: schema.users.deletedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) return null;
  return isLifecycleRecipientEligible(user);
}

export async function resolveConnectorCandidateName(
  db: PostgresJsDatabase<typeof schema>,
  contactId: number | null,
  candidateUserId: string
): Promise<string> {
  const [user] = await db
    .select({
      fullName: schema.users.fullName,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
    })
    .from(schema.users)
    .where(eq(schema.users.id, candidateUserId))
    .limit(1);

  const userName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      formatUserDisplayName(user)
    : "";
  if (userName && userName !== "there") {
    return userName;
  }

  if (contactId) {
    const [contact] = await db
      .select({
        firstName: schema.contacts.firstName,
        lastName: schema.contacts.lastName,
      })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.id, contactId),
          isNull(schema.contacts.deletedAt)
        )
      )
      .limit(1);

    const contactName = contact
      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
      : "";
    if (contactName) {
      return contactName;
    }
  }

  return "Your candidate";
}

export async function loadCandidateJobContext(
  db: PostgresJsDatabase<typeof schema>,
  candidateId: string
) {
  const [row] = await db
    .select({
      jobId: schema.recruitmentJobCandidates.jobId,
      candidateUserId: schema.recruitmentJobCandidates.candidateUserId,
      contactId: schema.recruitmentJobCandidates.contactId,
      anonymousLabel: schema.recruitmentJobCandidates.anonymousLabel,
      matchScore: schema.recruitmentJobCandidates.matchScore,
      hireDate: schema.recruitmentJobCandidates.hireDate,
      jobTitle: schema.recruitmentJobsSchema.title,
      companyName: schema.recruitmentJobsSchema.companyName,
      requesterId: schema.recruitmentJobsSchema.requesterId,
      probationPeriodDays: schema.recruitmentJobsSchema.probationPeriodDays,
      bountyAmount: schema.recruitmentJobPricesSchema.bountyAmount,
      hasSuccessFee: schema.recruitmentJobPricesSchema.hasSuccessFee,
      successFeeAmount: schema.recruitmentJobPricesSchema.successFeeAmount,
      intConnectorPayoutWaitDays:
        schema.recruitmentJobPricesSchema.intConnectorPayoutWaitDays,
      extConnectorPayoutWaitDays:
        schema.recruitmentJobPricesSchema.extConnectorPayoutWaitDays,
    })
    .from(schema.recruitmentJobCandidates)
    .innerJoin(
      schema.recruitmentJobsSchema,
      eq(schema.recruitmentJobCandidates.jobId, schema.recruitmentJobsSchema.id)
    )
    .leftJoin(
      schema.recruitmentJobPricesSchema,
      eq(
        schema.recruitmentJobCandidates.jobId,
        schema.recruitmentJobPricesSchema.jobId
      )
    )
    .where(
      and(
        eq(schema.recruitmentJobCandidates.id, candidateId),
        isNull(schema.recruitmentJobCandidates.deletedAt)
      )
    )
    .limit(1);

  return row ?? null;
}

export function escapeVars(
  vars: Record<string, string | number | boolean>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === "string") {
      out[key] = escapeHtml(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function buildLifecycleLogContext(
  emailLogsService: RecruitmentEmailLogsService,
  ctx: { jobId: string; requesterId?: string },
  candidateId: string,
  createdBy?: string | null
): LifecycleEmailLogContext {
  return {
    emailLogsService,
    jobId: ctx.jobId,
    candidateId,
    poolMatchId: null,
    createdBy: createdBy ?? ctx.requesterId ?? null,
  };
}
