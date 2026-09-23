import { CreateMediaDto } from "./media.dto";
import { MediaModules, MediaType } from "./media.constants";

export interface CreateMediaArgs {
  module: MediaModules;
  fileName: string;
  filePath: string;
  fileType: MediaType;
  mimeType: string;
  size: number;
  metadata?: Record<string, string | number>;
  recordId: string;
}

export interface UpdateMediaArgs {
  id?: string;
  data: CreateMediaArgs;
  queryRunner?: AnyType;
}

export interface CreateMediaInterface {
  data: CreateMediaArgs[];
  queryRunner?: AnyType;
  userId?: string;
}

export interface DeleteMediaInterface {
  ids: string[];
  queryRunner?: AnyType;
  userId?: string;
}

export interface DeleteMediaByRecordIdInterface {
  ids: string[];
  queryRunner?: AnyType;
  userId?: string;
}

export interface ManageMediaInterface {
  queryRunner?: AnyType;
  media?: CreateMediaDto[];
  recordId: string;
  userId: string;
  removedMediaIds?: string[];
}

export interface CountRecordAttachmentsArgs {
  queryRunner?: AnyType;
  recordId: string;
}
