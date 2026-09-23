import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { appConfig } from "config/app.config";
import { awsS3Config } from "config/awsS3.config";
import { toUTC } from "utils/dayjs";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import {
  CreateMediaInterface,
  DeleteMediaByRecordIdInterface,
} from "./media.types";
import { ERROR_MESSAGES, MediaModules } from "./media.constants";

@Injectable()
export class MediaService {
  private readonly cloudFrontUrl = awsS3Config.cloudFrontUrl;
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  getFullS3Url(filePath: string): string {
    if (!filePath) return "";
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    const baseUrl =
      appConfig.isProduction && awsS3Config.mediaProspectlyUrl
        ? awsS3Config.mediaProspectlyUrl
        : this.cloudFrontUrl;
    const normalizedBase = baseUrl?.endsWith("/")
      ? baseUrl.slice(0, -1)
      : (baseUrl ?? "");
    const path = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    return `${normalizedBase}/${path}`;
  }

  async findByRecordId(recordId: string, module: string) {
    return this.db.query.mediaSchema.findFirst({
      where: and(
        eq(schema.mediaSchema.recordId, recordId),
        eq(schema.mediaSchema.module, module),
        isNull(schema.mediaSchema.deletedAt)
      ),
    });
  }

  async findByRecordIds(recordIds: string[], module: string) {
    if (!recordIds.length) return [];

    return this.db.query.mediaSchema.findMany({
      where: and(
        inArray(schema.mediaSchema.recordId, recordIds),
        eq(schema.mediaSchema.module, module),
        isNull(schema.mediaSchema.deletedAt)
      ),
    });
  }

  async createMedia({ data, queryRunner, userId }: CreateMediaInterface) {
    if (!data.length) return;
    const filePathArray = data.map(({ filePath }) => filePath);

    const tx = queryRunner || this.db;

    const fileExists = await tx.query.mediaSchema.findFirst({
      where: and(
        inArray(schema.mediaSchema.filePath, filePathArray),
        isNull(schema.mediaSchema.deletedAt)
      ),
    });

    if (fileExists) {
      throw new ConflictException(ERROR_MESSAGES.MEDIA_ALREADY_EXISTS);
    }

    const records = data.map((item) => ({
      recordId: item.recordId,
      module: item.module,
      filePath: item.filePath,
      fileName: item.fileName,
      fileType: item.fileType,
      mimeType: item.mimeType,
      size: item.size?.toString(),
      createdBy: userId,
    }));

    const inserted = await tx
      .insert(schema.mediaSchema)
      .values(records)
      .returning();

    this.logger.log(`MEDIA - CREATE_MEDIA :: ${JSON.stringify(records)}`);
    return inserted;
  }

  async deleteMediaByRecordId({
    ids,
    queryRunner,
    userId,
  }: DeleteMediaByRecordIdInterface) {
    const tx = queryRunner || this.db;

    const records = await tx.query.mediaSchema.findMany({
      where: inArray(schema.mediaSchema.recordId, ids),
    });

    if (records.length) {
      await tx
        .update(schema.mediaSchema)
        .set({
          deletedAt: toUTC(),
          updatedBy: userId,
        })
        .where(inArray(schema.mediaSchema.recordId, ids));

      this.logger.log(
        `MEDIA - DELETE_MEDIA_BY_RECORD_ID :: ${JSON.stringify(records)}`
      );
    }
  }

  async manageMedia(
    recordId: string,
    module: MediaModules,
    media: AnyType[],
    userId?: string
  ) {
    const existMedia = await this.db.query.mediaSchema.findMany({
      where: and(
        eq(schema.mediaSchema.recordId, recordId),
        eq(schema.mediaSchema.module, module),
        isNull(schema.mediaSchema.deletedAt)
      ),
    });

    const existingMediaPath = existMedia.map((m) => m.filePath);

    const mediaToAdd = media.filter(
      (m) => !existingMediaPath.includes(m.filePath)
    );

    const mediaToRemove = existingMediaPath.filter(
      (path) => !media.map((m) => m.filePath).includes(path)
    );

    const mediaToUpdate = media.filter((m: AnyType) =>
      existingMediaPath.includes(m.filePath)
    );

    await this.db.transaction(async (tx) => {
      if (mediaToRemove.length > 0) {
        await this.deleteMedia(mediaToRemove, tx);
      }

      if (mediaToAdd.length > 0) {
        await this.validateMedia(
          mediaToAdd.map((m) => m.filePath),
          tx
        );

        const newMediaRecords = mediaToAdd.map((mediaEntity) => ({
          recordId,
          module,
          filePath: mediaEntity.filePath,
          fileName: mediaEntity.fileName,
          fileType: mediaEntity.fileType,
          mimeType: mediaEntity.mimeType,
          size: mediaEntity.size?.toString(),
          createdBy: userId,
        }));

        await tx.insert(schema.mediaSchema).values(newMediaRecords);
      }

      if (mediaToUpdate.length > 0) {
        await Promise.all(
          mediaToUpdate.map(async (mediaEntity) => {
            const existMediaEntity = existMedia.find(
              (m) => m.filePath === mediaEntity.filePath
            );
            if (existMediaEntity) {
              await tx
                .update(schema.mediaSchema)
                .set({
                  updatedBy: userId,
                  updatedAt: toUTC(),
                })
                .where(eq(schema.mediaSchema.id, existMediaEntity.id));
            }
          })
        );
      }
    });
  }

  async validateMedia(paths: string[], queryRunner?: AnyType) {
    const tx = queryRunner || this.db;
    if (!paths.length) return;

    const existMedia = await tx.query.mediaSchema.findMany({
      where: inArray(schema.mediaSchema.filePath, paths),
    });

    if (existMedia.length !== paths.length) {
      throw new ConflictException(ERROR_MESSAGES.MEDIA_ALREADY_EXISTS);
    }
  }

  async deleteMedia(paths: string[], queryRunner?: AnyType) {
    const tx = queryRunner || this.db;

    const existMedia = await tx.query.mediaSchema.findMany({
      where: inArray(schema.mediaSchema.filePath, paths),
    });

    if (existMedia.length !== paths.length) {
      throw new NotFoundException(ERROR_MESSAGES.MEDIA_NOT_FOUND);
    }

    await tx
      .update(schema.mediaSchema)
      .set({ deletedAt: toUTC() })
      .where(inArray(schema.mediaSchema.filePath, paths));
  }
}
