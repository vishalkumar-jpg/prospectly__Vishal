export interface LinkedInContactsImportJobData {
  userId: string;
  importRecordId: string;
  s3Key: string;
}

export interface LinkedInContactsImportJobResult {
  success: boolean;
  userId: string;
  importRecordId: string;
  imported: number;
  failed: number;
  duplicates: number;
  totalFetched: number;
  error?: string;
}
