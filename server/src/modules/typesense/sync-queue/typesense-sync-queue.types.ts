import { ApolloCacheDocument } from "modules/typesense/core/typesense.types";

export interface ContactSyncJobData {
  contactIds: string[];
  userId: string;
  source: string;
}

export interface ApolloCacheSyncJobData {
  documents: ApolloCacheDocument[];
}

export type TypesenseSyncJobData = ContactSyncJobData | ApolloCacheSyncJobData;

export interface TypesenseSyncJobResult {
  success: boolean;
  totalDocuments: number;
  synced: number;
  failed: number;
  failedDocumentIds: string[];
}
