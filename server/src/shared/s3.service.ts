import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";

@Injectable()
export class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName = "";
  private isConfigured = false;
  private readonly MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
  private readonly MAX_ZIP_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes for zip files
  private readonly ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
  private readonly ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];
  private readonly ALLOWED_ZIP_EXTENSIONS = [".zip"];
  private readonly ALLOWED_ZIP_MIME_TYPES = [
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ];

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    const region = this.configService.get<string>("AWS_REGION") || "us-east-1";
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "AWS_SECRET_ACCESS_KEY"
    );
    this.bucketName =
      this.configService.get<string>("AWS_S3_BUCKET_NAME") || "";

    // Make S3 optional - only configure if credentials are provided
    if (accessKeyId && secretAccessKey && this.bucketName) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.isConfigured = true;
    }
  }

  /**
   * Check if S3 is configured
   */
  checkConfigured(): void {
    if (!this.isConfigured || !this.s3Client) {
      throw new BadRequestException(
        "S3 storage is not configured. Please contact support."
      );
    }
  }

  /**
   * Validate file type and size
   */
  validateFile(fileName: string, fileSize: number, mimeType?: string): void {
    // Validate file size
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Validate file extension
    const extension = this.getFileExtension(fileName || "").toLowerCase();
    const hasValidExtension =
      extension && this.ALLOWED_EXTENSIONS.includes(extension);

    // Validate MIME type
    const normalizedMimeType = mimeType?.toLowerCase();
    const hasValidMimeType =
      normalizedMimeType &&
      this.ALLOWED_MIME_TYPES.includes(normalizedMimeType);

    // File type is valid if either extension OR MIME type is valid (or both)
    // This allows validation to pass even if filename is missing but MIME type is correct
    if (!hasValidExtension && !hasValidMimeType) {
      // If we have a filename but no valid extension, and no MIME type, reject
      if (fileName && !mimeType) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${this.ALLOWED_EXTENSIONS.join(", ")}`
        );
      }
      // If we have MIME type but it's invalid, reject
      if (mimeType && !hasValidMimeType) {
        throw new BadRequestException(
          `Invalid MIME type. Allowed types: ${this.ALLOWED_MIME_TYPES.join(", ")}`
        );
      }
      // If we have neither valid extension nor valid MIME type, reject
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_EXTENSIONS.join(", ")} or MIME types: ${this.ALLOWED_MIME_TYPES.join(", ")}`
      );
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.substring(lastDot) : "";
  }

  /**
   * Generate S3 key for profile photo
   * Format: profiles/{userId}.{extension}
   */
  generateProfilePhotoKey(userId: string, fileName: string): string {
    const extension = this.getFileExtension(fileName).toLowerCase();
    return `profiles/${userId}${extension}`;
  }

  /**
   * Generate presigned PUT URL for uploading a profile photo directly from the client
   * @param userId - User ID
   * @param fileName - Original file name
   * @param fileSize - File size in bytes
   * @param mimeType - MIME type of the file
   * @param expiresIn - Expiration time in seconds (default: 15 minutes)
   */
  async generatePresignedPutUrlForProfilePhoto(
    userId: string,
    fileName: string,
    fileSize: number,
    mimeType?: string,
    expiresIn = 900
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    // Check if S3 is configured
    this.checkConfigured();

    if (!fileName) {
      throw new BadRequestException("File name is required");
    }

    if (!fileSize || fileSize <= 0) {
      throw new BadRequestException("File size must be greater than zero");
    }

    // Re-use existing validation logic
    this.validateFile(fileName, fileSize, mimeType);

    // Generate S3 key for this user
    const key = this.generateProfilePhotoKey(userId, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client! as AnyType, command, {
      expiresIn,
    });

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Validate zip file type and size
   */
  validateZipFile(fileName: string, fileSize: number, mimeType?: string): void {
    // Validate file size
    if (fileSize > this.MAX_ZIP_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_ZIP_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Validate file extension
    const extension = this.getFileExtension(fileName || "").toLowerCase();
    const hasValidExtension =
      extension && this.ALLOWED_ZIP_EXTENSIONS.includes(extension);

    // Validate MIME type
    const normalizedMimeType = mimeType?.toLowerCase();
    const hasValidMimeType =
      normalizedMimeType &&
      this.ALLOWED_ZIP_MIME_TYPES.includes(normalizedMimeType);

    // File type is valid if either extension OR MIME type is valid (or both)
    if (!hasValidExtension && !hasValidMimeType) {
      if (fileName && !mimeType) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${this.ALLOWED_ZIP_EXTENSIONS.join(", ")}`
        );
      }
      if (mimeType && !hasValidMimeType) {
        throw new BadRequestException(
          `Invalid MIME type. Allowed types: ${this.ALLOWED_ZIP_MIME_TYPES.join(", ")}`
        );
      }
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.ALLOWED_ZIP_EXTENSIONS.join(", ")} or MIME types: ${this.ALLOWED_ZIP_MIME_TYPES.join(", ")}`
      );
    }
  }

  /**
   * Generate S3 key for LinkedIn zip file
   * Format: linkedin-imports/{userId}/{uuid}/{originalFileName}.zip
   */
  generateLinkedInZipKey(userId: string, fileName: string): string {
    const uuid = randomUUID();
    const extension = this.getFileExtension(fileName).toLowerCase();
    const baseName = fileName.replace(extension, "") || "linkedin-export";
    // Sanitize filename to remove special characters
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");
    return `linkedin-imports/${userId}/${uuid}/${sanitizedBaseName}${extension || ".zip"}`;
  }

  /**
   * Generate presigned PUT URL for uploading a LinkedIn zip file directly from the client
   * @param userId - User ID
   * @param fileName - Original file name
   * @param fileSize - File size in bytes
   * @param mimeType - MIME type of the file
   * @param expiresIn - Expiration time in seconds (default: 15 minutes)
   */
  async generatePresignedPutUrlForLinkedInZip(
    userId: string,
    fileName: string,
    fileSize: number,
    mimeType?: string,
    expiresIn = 900
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    // Check if S3 is configured
    this.checkConfigured();

    if (!fileName) {
      throw new BadRequestException("File name is required");
    }

    if (!fileSize || fileSize <= 0) {
      throw new BadRequestException("File size must be greater than zero");
    }

    // Validate zip file
    this.validateZipFile(fileName, fileSize, mimeType);

    // Generate S3 key for this user
    const key = this.generateLinkedInZipKey(userId, fileName);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType || "application/zip",
    });

    const uploadUrl = await getSignedUrl(this.s3Client! as AnyType, command, {
      expiresIn,
    });

    return {
      uploadUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Download an object from S3 by key (e.g. media `file_path`).
   */
  async downloadObject(s3Key: string): Promise<Buffer> {
    this.checkConfigured();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client!.send(command);

      if (!response.Body) {
        throw new BadRequestException("File not found in S3");
      }

      const chunks: Uint8Array[] = [];
      const stream = response.Body as AnyType;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new BadRequestException(
        `Failed to download file from S3: ${errorMessage}`
      );
    }
  }

  /**
   * Download LinkedIn zip file from S3
   * @param s3Key - S3 key of the zip file
   * @returns Buffer containing the zip file data
   */
  async downloadLinkedInZip(s3Key: string): Promise<Buffer> {
    return this.downloadObject(s3Key);
  }

  /**
   * Generate presigned GET URL for viewing an S3 object
   * Use this for private buckets that don't have public read access
   * @param s3Key - S3 key of the object
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Presigned URL that allows temporary access to the object
   */
  async generatePresignedGetUrl(
    s3Key: string,
    expiresIn = 3600
  ): Promise<string> {
    // Check if S3 is configured
    this.checkConfigured();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(
      this.s3Client! as AnyType,
      command,
      {
        expiresIn, // 1 hour default
      }
    );

    return presignedUrl;
  }

  /**
   * Upload a buffer to S3 with a specified key (generic method)
   * @param key - S3 key (path) where the file will be stored
   * @param buffer - File buffer data
   * @param mimeType - MIME type of the file
   */
  async uploadBuffer(
    key: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<void> {
    this.checkConfigured();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client!.send(command);
  }

  /**
   * Upload profile photo directly from a buffer (used for OAuth profile photos)
   * @param userId - User ID
   * @param buffer - Image buffer data
   * @param mimeType - MIME type of the image (e.g., 'image/jpeg')
   * @returns S3 key where the photo was uploaded
   */
  async uploadProfilePhotoFromBuffer(
    userId: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    // Check if S3 is configured
    this.checkConfigured();

    // Validate file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Determine file extension from MIME type
    let extension = ".jpg";
    if (mimeType === "image/png") {
      extension = ".png";
    } else if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      extension = ".jpg";
    }

    // Generate S3 key for profile photo
    const key = `profiles/${userId}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client!.send(command);

    return key;
  }

  /**
   * Check if S3 storage is available (configured with credentials)
   * @returns true if S3 is configured and ready to use
   */
  isS3Available(): boolean {
    return this.isConfigured && this.s3Client !== null;
  }
}
