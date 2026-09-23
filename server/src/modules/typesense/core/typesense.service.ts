import { Injectable, Inject, Logger } from "@nestjs/common";
import { Client } from "typesense";
import {
  TYPESENSE_TOKEN,
  TYPESENSE_COLLECTION_NAME,
  APOLLO_CACHE_COLLECTION_NAME,
  TYPESENSE_CHUNK_SIZE,
  TYPESENSE_MAX_RETRIES_PER_DOC,
} from "./typesense.constants";
import {
  TypesenseContactDocument,
  ApolloCacheDocument,
  BulkUpsertResult,
} from "./typesense.types";

@Injectable()
export class TypesenseService {
  private readonly logger = new Logger(TypesenseService.name);

  constructor(
    @Inject(TYPESENSE_TOKEN)
    private readonly client: Client
  ) {}

  async bulkUpsert(
    documents: TypesenseContactDocument[]
  ): Promise<BulkUpsertResult> {
    return this.bulkUpsertToCollection(TYPESENSE_COLLECTION_NAME, documents);
  }

  async bulkUpsertApolloCache(
    documents: ApolloCacheDocument[]
  ): Promise<BulkUpsertResult> {
    return this.bulkUpsertToCollection(APOLLO_CACHE_COLLECTION_NAME, documents);
  }

  private async bulkUpsertToCollection<T extends { id: string }>(
    collectionName: string,
    documents: T[]
  ): Promise<BulkUpsertResult> {
    if (documents.length === 0) {
      return { totalDocuments: 0, successCount: 0, failedDocumentIds: [] };
    }

    let successCount = 0;
    const failedDocumentIds: string[] = [];

    // Process in chunks
    for (let i = 0; i < documents.length; i += TYPESENSE_CHUNK_SIZE) {
      const chunk = documents.slice(i, i + TYPESENSE_CHUNK_SIZE);

      try {
        const results = await this.client
          .collections(collectionName)
          .documents()
          .import(chunk as Record<string, unknown>[], { action: "upsert" });

        // Parse results — each element has { success: boolean, error?: string }
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.success) {
            successCount++;
          } else {
            failedDocumentIds.push(chunk[j].id);
            this.logger.warn(
              `Failed to upsert document ${chunk[j].id}: ${result.error}`
            );
          }
        }
      } catch (error) {
        // Entire chunk failed
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`Chunk upsert failed: ${errorMessage}`);
        for (const doc of chunk) {
          failedDocumentIds.push(doc.id);
        }
      }
    }

    return {
      totalDocuments: documents.length,
      successCount,
      failedDocumentIds,
    };
  }

  async retryFailedDocuments(
    documents: TypesenseContactDocument[],
    failedIds: string[],
    maxRetries: number = TYPESENSE_MAX_RETRIES_PER_DOC
  ): Promise<{ finalFailedIds: string[] }> {
    let currentFailedIds = [...failedIds];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (currentFailedIds.length === 0) break;

      this.logger.log(
        `Retry attempt ${attempt}/${maxRetries} for ${currentFailedIds.length} failed documents`
      );

      const failedDocs = documents.filter((doc) =>
        currentFailedIds.includes(doc.id)
      );

      const result = await this.bulkUpsert(failedDocs);
      currentFailedIds = result.failedDocumentIds;
    }

    return { finalFailedIds: currentFailedIds };
  }
}
