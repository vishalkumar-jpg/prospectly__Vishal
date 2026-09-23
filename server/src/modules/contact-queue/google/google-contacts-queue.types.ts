export interface GoogleContactsImportJobData {
  userId: string;
  integrationId: string;
}

export interface GoogleContactsImportJobResult {
  success: boolean;
  userId: string;
  integrationId: string;
  imported: number;
  failed: number;
  duplicates: number;
  totalFetched: number;
  error?: string;
}
