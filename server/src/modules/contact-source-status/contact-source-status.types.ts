export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface ContactSourceStatus {
  source: string;
  isActive: boolean;
  contactCount: number;
  importStatus: ImportStatus | null;
  imported: number;
  failed: number;
  duplicates: number;
  totalFetched: number;
  importStartedAt: Date | null;
  importCompletedAt: Date | null;
  importErrorMessage: string | null;
  latestImport?: {
    id: string;
    status: ImportStatus;
    imported: number;
    failed: number;
    duplicates: number;
    totalFetched: number;
    errorMessage?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
    createdAt: Date;
  };
  /** Active OAuth/credential rows for this provider (google / microsoft / apple). */
  connectedAccountCount?: number;
  maxConnectedAccountsPerProvider?: number;
}
