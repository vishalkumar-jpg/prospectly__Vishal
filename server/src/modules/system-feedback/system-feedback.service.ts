import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { MediaService } from "modules/media/media.service";
import { MediaModules } from "modules/media/media.constants";
import { getImageUrl } from "utils/helper.utils";
import { CreateSystemFeedbackDto } from "./system-feedback.dto";
import { SystemFeedbackNotificationService } from "./system-feedback-notification.service";

@Injectable()
export class SystemFeedbackService {
  private readonly logger = new Logger(SystemFeedbackService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly mediaService: MediaService,
    private readonly notificationService: SystemFeedbackNotificationService
  ) {}

  async createFeedback(userId: string, data: CreateSystemFeedbackDto) {
    const [feedback] = await this.db
      .insert(schema.systemFeedback)
      .values({
        userId,
        type: data.type,
        priority: data.priority,
        title: data.title,
        description: data.description,
        currentPage: data.currentPage,
      })
      .returning();

    let attachmentCount = 0;
    if (data.media && data.media.length > 0) {
      attachmentCount = data.media.length;
      await this.mediaService.createMedia({
        data: data.media.map((media) => ({
          recordId: feedback.id,
          module: MediaModules.SYSTEM_FEEDBACK,
          filePath: media.filePath,
          fileName: media.fileName,
          fileType: media.fileType,
          mimeType: media.mimeType,
          size: media.size,
          createdBy: userId,
        })),
        userId,
      });
    }

    void this.notificationService
      .sendSubmissionNotifications(feedback, attachmentCount)
      .catch((error) => {
        this.logger.error(
          `SYSTEM_FEEDBACK_SERVICE :: CREATE_FEEDBACK : ERROR : ${error}`
        );
      });

    return feedback;
  }

  async findMyFeedback(userId: string) {
    const rows = await this.db
      .select()
      .from(schema.systemFeedback)
      .where(eq(schema.systemFeedback.userId, userId))
      .orderBy(desc(schema.systemFeedback.createdAt));

    const feedbackIds = rows.map((row) => row.id);
    const mediaMap = new Map<string, Array<Record<string, unknown>>>();

    if (feedbackIds.length > 0) {
      const mediaList = await this.db.query.mediaSchema.findMany({
        where: and(
          inArray(schema.mediaSchema.recordId, feedbackIds),
          eq(schema.mediaSchema.module, MediaModules.SYSTEM_FEEDBACK),
          isNull(schema.mediaSchema.deletedAt)
        ),
      });

      mediaList.forEach((media) => {
        const { recordId } = media;
        if (!mediaMap.has(recordId)) {
          mediaMap.set(recordId, []);
        }
        mediaMap.get(recordId)!.push({
          id: media.id,
          fileName: media.fileName,
          filePath: getImageUrl(media.filePath),
          mimeType: media.mimeType,
          fileType: media.fileType,
          size: media.size,
        });
      });
    }

    return rows.map((row) => ({
      ...row,
      media: mediaMap.get(row.id) ?? [],
    }));
  }
}
