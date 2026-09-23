export interface AppleContactsImportJobData {
  userId: string;
  integrationId: string;
}

export interface AppleContactsImportJobResult {
  success: boolean;
  userId: string;
  integrationId: string;
  imported: number;
  failed: number;
  duplicates: number;
  totalFetched: number;
  error?: string;
}
