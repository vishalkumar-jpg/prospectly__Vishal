export interface MicrosoftContactsImportJobData {
  userId: string;
  integrationId: string;
}

export interface MicrosoftContactsImportJobResult {
  success: boolean;
  userId: string;
  integrationId: string;
  imported: number;
  failed: number;
  duplicates: number;
  totalFetched: number;
  error?: string;
}
