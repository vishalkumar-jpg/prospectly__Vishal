export enum AccessControl {
  PUBLIC_READ = "public-read",
  PRIVATE = "private",
  NONE = "none",
}

export interface GetPresignUrl {
  filePath: string;
  fileName?: string;
  fileType: string;
  accessControl?: AccessControl;
}

export interface GetPresignUrlQuery extends GetPresignUrl {
  metadata?: string;
}

export interface GetPresignUrlInput extends GetPresignUrl {
  metadata?: Record<string, string>;
}
