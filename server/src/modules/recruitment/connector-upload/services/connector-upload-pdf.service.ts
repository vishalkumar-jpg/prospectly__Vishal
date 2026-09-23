import { Injectable, Inject } from "@nestjs/common";
import { UnrecoverableError } from "bullmq";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { S3Service } from "shared/s3.service";
import { CONNECTOR_UPLOAD_MESSAGES } from "../connector-upload.constants";
import { isValidPdfBuffer } from "../../resume-extraction/resume-extraction.constants";

@Injectable()
export class ConnectorUploadPdfService {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly s3: S3Service
  ) {}

  async downloadAndValidate(
    mediaId: string,
    connectorUserId: string
  ): Promise<Buffer> {
    const [media] = await this.db
      .select()
      .from(schema.mediaSchema)
      .where(
        and(
          eq(schema.mediaSchema.id, mediaId),
          isNull(schema.mediaSchema.deletedAt)
        )
      )
      .limit(1);

    if (!media || media.createdBy !== connectorUserId || !media.filePath) {
      throw new UnrecoverableError(`Media not found: ${mediaId}`);
    }

    const buffer = await this.s3.downloadObject(media.filePath);
    const maxSize = 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new UnrecoverableError(
        CONNECTOR_UPLOAD_MESSAGES.ERROR.FILE_TOO_LARGE
      );
    }

    const normalizedMime =
      media.mimeType?.split(";")[0]?.trim().toLowerCase() || null;
    const isPdf =
      normalizedMime === "application/pdf" ||
      Boolean(media.fileName?.toLowerCase().endsWith(".pdf"));

    if (!isPdf || !isValidPdfBuffer(buffer)) {
      throw new UnrecoverableError(CONNECTOR_UPLOAD_MESSAGES.ERROR.INVALID_PDF);
    }

    return buffer;
  }
}
