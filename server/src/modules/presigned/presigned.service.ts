import { Injectable } from "@nestjs/common";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { awsS3Config } from "config/awsS3.config";
import { appConfig } from "config/app.config";
import {
  generateSignedUrl,
  getAllowedFileCondition,
  S3,
} from "utils/awsS3.utils";
import { transformToInstance } from "utils/helper.utils";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { AccessControl } from "./presigned.types";
import { GetPresignUrlInput } from "./presigned.types";
import {
  PresignedPostResponseDto,
  PresignedResponseDto,
} from "./presigned.response";
import { PresignDto } from "./presigned.dto";

@Injectable()
export class PresignedService {
  private readonly bucketName = awsS3Config.bucketName;
  private readonly cloudFrontUrl = awsS3Config.cloudFrontUrl;
  private readonly expireInSeconds = +awsS3Config.signedUrlExpiration;

  private getPublicBaseUrl(): string {
    const raw =
      appConfig.isProduction && awsS3Config.mediaProspectlyUrl
        ? awsS3Config.mediaProspectlyUrl
        : this.cloudFrontUrl;
    return raw?.endsWith("/") ? raw.slice(0, -1) : (raw ?? "");
  }

  async generatePresignedUrl(payload: PresignDto) {
    const { filePath, fileName, fileType, accessControl, metadata } = payload;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      ContentType: fileType,
      ...(accessControl && accessControl !== AccessControl.NONE
        ? { ACL: accessControl as AnyType }
        : {}),
      Metadata: {
        ...metadata,
        ...(fileName ? { "original-name": fileName } : {}),
      },
    });
    const signedRequest = await generateSignedUrl(command);
    const baseUrl = this.getPublicBaseUrl();
    return transformToInstance(PresignedResponseDto, {
      signedRequest,
      cloudFrontURL: baseUrl
        ? `${baseUrl}/${filePath}`
        : `${this.cloudFrontUrl}${filePath}`,
    });
  }

  async generatePresignedPost({
    filePath,
    fileName,
    fileType,
    metadata,
    accessControl,
  }: GetPresignUrlInput) {
    const { conditions: typeConditions } = getAllowedFileCondition(fileType);
    const minSize = Number(appConfig.presigned.minFileSize) || 0;
    const isVideo = fileType.startsWith("video/");
    const defaultMaxSize = isVideo ? 100 * 1024 * 1024 : 30 * 1024 * 1024;
    const maxSize = Number(appConfig.presigned.maxFileSize) || defaultMaxSize;

    const conditions: AnyType[] = [
      typeConditions,
      ["content-length-range", minSize, maxSize],
    ];

    const sanitizedMetadata = { ...metadata };
    for (const k of ["key", "Content-Type", "acl"]) {
      delete (sanitizedMetadata as AnyType)[k];
    }

    const fields: Record<string, string> = {
      ...sanitizedMetadata,
      key: filePath,
      "Content-Type": fileType,
      ...(fileName ? { "x-amz-meta-original-name": fileName } : {}),
    };

    if (accessControl && accessControl !== AccessControl.NONE) {
      conditions.push({ acl: accessControl });
      fields.acl = accessControl;
    }

    const { url, fields: signedFields } = await createPresignedPost(S3, {
      Bucket: this.bucketName,
      Key: filePath,
      Conditions: conditions,
      Fields: fields,
      Expires: this.expireInSeconds,
    });

    const baseUrl = this.getPublicBaseUrl();
    return transformToInstance(PresignedPostResponseDto, {
      signedRequest: { url, fields: signedFields },
      cloudFrontURL: (baseUrl || this.cloudFrontUrl) ?? "",
    });
  }
}
