import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { toUTC, utcDayjs } from "utils/dayjs";
import {
  MAX_RECRUITMENT_EMAIL_RAW_EVENTS,
  RECRUITMENT_EMAIL_LOG_STATUS,
  RECRUITMENT_EMAIL_LOG_STATUS_PRIORITY,
  type RecruitmentEmailLogType,
  type RecruitmentEmailRecipientType,
} from "./recruitment-email-logs.constants";

export type CreateRecruitmentEmailLogInput = {
  jobId: string;
  candidateId?: string | null;
  poolMatchId?: string | null;
  emailType: RecruitmentEmailLogType;
  recipientType?: RecruitmentEmailRecipientType;
  providerId: string;
  recipientEmail: string;
  subject?: string | null;
  emailBody?: string | null;
  createdBy?: string | null;
};

@Injectable()
export class RecruitmentEmailLogsService {
  private readonly logger = new Logger(RecruitmentEmailLogsService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async createOne(row: CreateRecruitmentEmailLogInput): Promise<void> {
    const now = toUTC();
    await this.db.insert(schema.recruitmentEmailLogsSchema).values({
      jobId: row.jobId,
      candidateId: row.candidateId ?? null,
      poolMatchId: row.poolMatchId ?? null,
      emailType: row.emailType,
      recipientType: row.recipientType ?? "candidate",
      providerId: row.providerId,
      recipientEmail: row.recipientEmail,
      subject: row.subject ?? null,
      emailBody: row.emailBody ?? null,
      status: RECRUITMENT_EMAIL_LOG_STATUS.SENT,
      sentAt: now,
      eventType: "email.sent",
      eventAt: now,
      createdBy: row.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async createMany(rows: CreateRecruitmentEmailLogInput[]): Promise<void> {
    if (rows.length === 0) return;
    const now = toUTC();
    await this.db.insert(schema.recruitmentEmailLogsSchema).values(
      rows.map((row) => ({
        jobId: row.jobId,
        candidateId: row.candidateId ?? null,
        poolMatchId: row.poolMatchId ?? null,
        emailType: row.emailType,
        recipientType: row.recipientType ?? "candidate",
        providerId: row.providerId,
        recipientEmail: row.recipientEmail,
        subject: row.subject ?? null,
        emailBody: row.emailBody ?? null,
        status: RECRUITMENT_EMAIL_LOG_STATUS.SENT,
        sentAt: now,
        eventType: "email.sent",
        eventAt: now,
        createdBy: row.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  async findByProviderId(providerId: string) {
    return this.db.query.recruitmentEmailLogsSchema.findFirst({
      where: and(
        eq(schema.recruitmentEmailLogsSchema.providerId, providerId),
        isNull(schema.recruitmentEmailLogsSchema.deletedAt)
      ),
    });
  }

  private shouldUpdateStatus(
    currentStatus: string | null,
    newStatus: string
  ): boolean {
    const current =
      RECRUITMENT_EMAIL_LOG_STATUS_PRIORITY[currentStatus ?? ""] ?? 0;
    const next = RECRUITMENT_EMAIL_LOG_STATUS_PRIORITY[newStatus] ?? 0;
    if (next >= 100) return true;
    return next > current;
  }

  async applyWebhookEvent(params: {
    providerId: string;
    eventType: string;
    createdAt?: string;
    detailType?: string;
    detailReason?: string;
    rawEvent: Record<string, unknown>;
  }): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [log] = await tx
        .select()
        .from(schema.recruitmentEmailLogsSchema)
        .where(
          and(
            eq(schema.recruitmentEmailLogsSchema.providerId, params.providerId),
            isNull(schema.recruitmentEmailLogsSchema.deletedAt)
          )
        )
        .for("update")
        .limit(1);

      if (!log) return false;

      const parsedEventAt = params.createdAt
        ? utcDayjs(params.createdAt)
        : null;
      const eventAt =
        parsedEventAt?.isValid() === true ? parsedEventAt.toDate() : toUTC();
      const currentEvents = Array.isArray(log.rawEvents) ? log.rawEvents : [];
      const updateData: Partial<
        typeof schema.recruitmentEmailLogsSchema.$inferInsert
      > = {
        eventType: params.eventType,
        eventAt,
        rawEvents: [
          ...currentEvents,
          {
            type: params.eventType,
            data: params.rawEvent,
            timestamp: toUTC().toISOString(),
          },
        ].slice(-MAX_RECRUITMENT_EMAIL_RAW_EVENTS),
        updatedAt: toUTC(),
      };

      const applyDetail = () => {
        if (!log.detailAt) updateData.detailAt = eventAt;
        updateData.detailType =
          params.detailType ?? log.detailType ?? "unknown";
        updateData.detailReason =
          params.detailReason ?? log.detailReason ?? "No reason provided";
      };

      if (params.eventType === "email.delivered") {
        if (
          this.shouldUpdateStatus(
            log.status,
            RECRUITMENT_EMAIL_LOG_STATUS.DELIVERED
          )
        ) {
          updateData.status = RECRUITMENT_EMAIL_LOG_STATUS.DELIVERED;
        }
        if (!log.deliveredAt) updateData.deliveredAt = eventAt;
        if (params.detailType || params.detailReason) applyDetail();
      } else if (params.eventType === "email.bounced") {
        updateData.status = RECRUITMENT_EMAIL_LOG_STATUS.BOUNCED;
        applyDetail();
      } else if (params.eventType === "email.failed") {
        if (
          this.shouldUpdateStatus(
            log.status,
            RECRUITMENT_EMAIL_LOG_STATUS.FAILED
          )
        ) {
          updateData.status = RECRUITMENT_EMAIL_LOG_STATUS.FAILED;
        }
        applyDetail();
      } else if (params.eventType === "email.complained") {
        updateData.status = RECRUITMENT_EMAIL_LOG_STATUS.COMPLAINED;
        applyDetail();
      } else if (params.eventType === "email.sent") {
        if (
          this.shouldUpdateStatus(log.status, RECRUITMENT_EMAIL_LOG_STATUS.SENT)
        ) {
          updateData.status = RECRUITMENT_EMAIL_LOG_STATUS.SENT;
        }
        if (!log.sentAt) updateData.sentAt = eventAt;
      }

      await tx
        .update(schema.recruitmentEmailLogsSchema)
        .set(updateData)
        .where(
          and(
            eq(schema.recruitmentEmailLogsSchema.id, log.id),
            isNull(schema.recruitmentEmailLogsSchema.deletedAt)
          )
        );

      this.logger.log(
        `Recruitment email webhook applied: ${params.eventType} for ${params.providerId}`
      );
      return true;
    });
  }
}
