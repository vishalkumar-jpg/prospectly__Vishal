import { Injectable, Inject } from "@nestjs/common";
import * as schema from "database/schema";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import { and, eq, desc, inArray } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

@Injectable()
export class ScheduledMeetingService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async createScheduledMeeting(data: {
    requesterId: string;
    introductionRequestId: string;
    prospectEmail: string;
    prospectName?: string;
    meetingDate: Date;
    meetingDuration?: number;
    meetingPlatform?: string;
    meetingLink?: string;
    calendarEventId?: string;
    calendarProvider?: string;
    metadata?: AnyType;
  }): Promise<schema.ScheduledMeeting> {
    const [meeting] = await this.db
      .insert(schema.scheduledMeetings)
      .values({
        ...data,
        meetingDuration: data.meetingDuration || 30,
        meetingPlatform: data.meetingPlatform || "google_meet",
        status: "scheduled",
      })
      .returning();
    return meeting;
  }

  async getScheduledMeetingByIntroductionRequestId(
    introductionRequestId: string
  ): Promise<schema.ScheduledMeeting | undefined> {
    return this.db.query.scheduledMeetings.findFirst({
      where: eq(
        schema.scheduledMeetings.introductionRequestId,
        introductionRequestId
      ),
      orderBy: desc(schema.scheduledMeetings.createdAt),
    });
  }

  async getScheduledMeetingsByStatusesAndProvider(
    statuses: string[],
    provider: string
  ): Promise<schema.ScheduledMeeting[]> {
    return this.db
      .select()
      .from(schema.scheduledMeetings)
      .where(
        and(
          inArray(schema.scheduledMeetings.status, statuses),
          eq(schema.scheduledMeetings.calendarProvider, provider)
        )
      );
  }

  async updateScheduledMeeting(
    id: string,
    data: Partial<{
      meetingDate: Date;
      meetingDuration: number;
      meetingLink: string;
      calendarEventId: string;
      status: string;
      metadata: AnyType;
    }>
  ): Promise<void> {
    await this.db
      .update(schema.scheduledMeetings)
      .set({ ...data, updatedAt: toUTC() })
      .where(eq(schema.scheduledMeetings.id, id));
  }

  async updateScheduledMeetingStatus(
    id: string,
    status: string
  ): Promise<void> {
    await this.db
      .update(schema.scheduledMeetings)
      .set({ status, updatedAt: toUTC() })
      .where(eq(schema.scheduledMeetings.id, id));
  }
}
