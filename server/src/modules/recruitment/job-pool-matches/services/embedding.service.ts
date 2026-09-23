import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  eq,
  and,
  isNull,
  isNotNull,
  not,
  inArray,
  gt,
  asc,
  sql,
} from "drizzle-orm";
import { geminiConfig } from "config/gemini.config";
import {
  AiUsageLoggerService,
  AI_PROVIDER_GEMINI,
  type AiUsageTrackingData,
} from "services/ai-usage-logger.service";
import { tokensFromGeminiUsageMetadata } from "utils/gemini-usage-metadata.util";
import {
  EMBEDDING_API_TIMEOUT_MS,
  EMBEDDING_BATCH_SIZE,
} from "../job-pool-matches.constants";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface EmbeddingResponse {
  embeddings?: Array<{
    values: number[];
  }>;
  error?: {
    message?: string;
    code?: number;
  };
  usageMetadata?: unknown;
}

/**
 * Asymmetric retrieval task types. Only opt in where both sides of a comparison
 * use them — contact and job vectors are compared directly against each other
 * and are stored untyped, so adding a task type there would break them.
 */
export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface EmbeddingOptions {
  taskType?: EmbeddingTaskType;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly aiUsageLogger: AiUsageLoggerService
  ) {}

  /**
   * Compose text representation of a contact for embedding generation.
   * Focuses on title, company, and skills — excludes location/industry
   * to prioritize role-relevance matching.
   */
  private composeContactText(contact: {
    title?: string | null;
    company?: string | null;
    skills?: unknown;
  }): string {
    const parts: string[] = [];

    if (contact.title) {
      parts.push(`Title: ${contact.title}`);
    }
    if (contact.company) {
      parts.push(`Company: ${contact.company}`);
    }

    const skills = contact.skills as string[] | null;
    if (Array.isArray(skills) && skills.length > 0) {
      parts.push(`Skills: ${skills.join(", ")}`);
    }

    return parts.join("\n");
  }

  /**
   * Compose text representation of a job for embedding generation.
   * Includes title, company, experience level, description, and skills.
   */
  composeJobText(job: {
    title: string;
    companyName: string;
    experienceLevel?: string | null;
    description?: string | null;
    requiredSkills?: unknown;
    preferredSkills?: unknown;
    requirements?: string | null;
  }): string {
    const parts: string[] = [];

    parts.push(`Title: ${job.title}`);
    parts.push(`Company: ${job.companyName}`);

    if (job.experienceLevel) {
      parts.push(`Experience: ${job.experienceLevel}`);
    }
    if (job.description) {
      parts.push(`Description: ${job.description.substring(0, 500)}`);
    }

    const requiredSkills = job.requiredSkills as string[] | null;
    if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
      parts.push(`Required Skills: ${requiredSkills.join(", ")}`);
    }

    const preferredSkills = job.preferredSkills as string[] | null;
    if (Array.isArray(preferredSkills) && preferredSkills.length > 0) {
      parts.push(`Preferred Skills: ${preferredSkills.join(", ")}`);
    }

    if (job.requirements) {
      parts.push(`Requirements: ${job.requirements.substring(0, 300)}`);
    }

    return parts.join("\n");
  }

  /**
   * Call Google's batch embedding API for multiple texts at once.
   * Returns an array of 768-dimensional vectors.
   */
  /**
   * Public entry point for callers outside this module. Existing contact/job
   * callers keep using the private method with no options, so their request
   * body is unchanged and their stored vectors stay comparable.
   */
  async embedTexts(
    texts: string[],
    options?: EmbeddingOptions,
    tracking?: AiUsageTrackingData
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.callBatchEmbeddingApi(texts, tracking, options);
  }

  private async callBatchEmbeddingApi(
    texts: string[],
    tracking?: AiUsageTrackingData,
    options?: EmbeddingOptions
  ): Promise<number[][]> {
    const started = Date.now();
    const trackingData: AiUsageTrackingData = {
      userId: tracking?.userId,
      actionType: tracking?.actionType ?? "embedding-batch",
    };
    if (!geminiConfig.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const url = `${EMBEDDING_API_BASE}/${EMBEDDING_MODEL}:batchEmbedContents?key=${geminiConfig.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: {
        parts: [{ text }],
      },
      outputDimensionality: 768,
      ...(options?.taskType ? { taskType: options.taskType } : {}),
    }));

    // Aborts propagate: the catch below logs the failure row and rethrows, so
    // BullMQ's retry policy handles a timeout like any other transient error.
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      EMBEDDING_API_TIMEOUT_MS
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as EmbeddingResponse;

      if (data.error) {
        throw new Error(
          `Embedding API error: ${data.error.message || "Unknown error"}`
        );
      }

      if (!data.embeddings || data.embeddings.length !== texts.length) {
        throw new Error(
          `Expected ${texts.length} embeddings, got ${data.embeddings?.length ?? 0}`
        );
      }

      const tok = tokensFromGeminiUsageMetadata(data.usageMetadata);
      void this.aiUsageLogger.logUsage({
        trackingData,
        provider: AI_PROVIDER_GEMINI,
        model: EMBEDDING_MODEL,
        promptTokens: tok.promptTokens,
        completionTokens: tok.completionTokens,
        totalTokens: tok.totalTokens,
        status: "success",
        responseTimeMs: Date.now() - started,
        retryCount: 0,
      });

      return data.embeddings.map((e) => e.values);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void this.aiUsageLogger.logUsage({
        trackingData,
        provider: AI_PROVIDER_GEMINI,
        model: EMBEDDING_MODEL,
        status: "failure",
        errorMessage: message,
        responseTimeMs: Date.now() - started,
        retryCount: 0,
      });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Generate and store embeddings for a list of contact IDs.
   * Processes in batches of EMBEDDING_BATCH_SIZE (500).
   */
  async generateContactEmbeddings(
    contactIds: number[],
    tracking?: AiUsageTrackingData
  ): Promise<void> {
    if (contactIds.length === 0) return;

    const contacts = await this.db
      .select({
        id: schema.contacts.id,
        title: schema.contacts.title,
        company: schema.contacts.company,
        skills: schema.contacts.skills,
      })
      .from(schema.contacts)
      .where(
        and(
          inArray(schema.contacts.id, contactIds),
          isNull(schema.contacts.deletedAt)
        )
      );

    if (contacts.length === 0) return;

    for (let i = 0; i < contacts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = contacts.slice(i, i + EMBEDDING_BATCH_SIZE);
      const texts = batch.map((c) => this.composeContactText(c));

      // Filter out contacts with empty text
      const validIndices: number[] = [];
      const validTexts: string[] = [];
      for (let j = 0; j < texts.length; j++) {
        if (texts[j].trim().length > 0) {
          validIndices.push(j);
          validTexts.push(texts[j]);
        }
      }

      if (validTexts.length === 0) continue;

      try {
        const embeddings = await this.callBatchEmbeddingApi(validTexts, {
          ...tracking,
          actionType: tracking?.actionType ?? "contact-embedding-batch",
        });

        for (let j = 0; j < validIndices.length; j++) {
          const contact = batch[validIndices[j]];
          await this.db
            .update(schema.contacts)
            .set({ embedding: embeddings[j] })
            .where(eq(schema.contacts.id, contact.id));
        }

        this.logger.log(
          `Generated embeddings for ${validTexts.length} contacts (batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1})`
        );
      } catch (error) {
        this.logger.error(
          `EMBEDDING_SERVICE :: generateContactEmbeddings : ERROR : ${error}`
        );
        throw error;
      }

      // Small delay between batches to avoid rate limiting
      if (i + EMBEDDING_BATCH_SIZE < contacts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Generate embedding for a single job and store it.
   * Returns the embedding vector for use in pgvector search.
   */
  async generateJobEmbedding(jobId: string): Promise<number[]> {
    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        experienceLevel: schema.recruitmentJobsSchema.experienceLevel,
        description: schema.recruitmentJobsSchema.description,
        requiredSkills: schema.recruitmentJobsSchema.requiredSkills,
        preferredSkills: schema.recruitmentJobsSchema.preferredSkills,
        requirements: schema.recruitmentJobsSchema.requirements,
        embedding: schema.recruitmentJobsSchema.embedding,
        requesterId: schema.recruitmentJobsSchema.requesterId,
      })
      .from(schema.recruitmentJobsSchema)
      .where(eq(schema.recruitmentJobsSchema.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Return existing embedding if already generated
    if (job.embedding) {
      return job.embedding;
    }

    const text = this.composeJobText(job);
    const [embedding] = await this.callBatchEmbeddingApi([text], {
      userId: job.requesterId,
      actionType: "job-pool-job-embedding",
    });

    await this.db
      .update(schema.recruitmentJobsSchema)
      .set({ embedding })
      .where(eq(schema.recruitmentJobsSchema.id, jobId));

    this.logger.log(`Generated embedding for job ${jobId}`);
    return embedding;
  }

  /**
   * Backfill embeddings for all contacts that don't have one yet.
   * Processes in batches with delays to avoid rate limiting.
   */
  async backfillAllContactEmbeddings(): Promise<void> {
    const PAGE_SIZE = EMBEDDING_BATCH_SIZE;
    let cursorId = 0;
    let totalProcessed = 0;

    while (true) {
      const batch = await this.db
        .select({
          id: schema.contacts.id,
          title: schema.contacts.title,
          company: schema.contacts.company,
          skills: schema.contacts.skills,
        })
        .from(schema.contacts)
        .where(
          and(
            isNull(schema.contacts.embedding),
            isNull(schema.contacts.deletedAt),
            gt(schema.contacts.id, cursorId),
            isNotNull(schema.contacts.title),
            not(eq(schema.contacts.title, "")),
            isNotNull(schema.contacts.skills),
            sql`jsonb_array_length(${schema.contacts.skills}::jsonb) > 0`
          )
        )
        .orderBy(asc(schema.contacts.id))
        .limit(PAGE_SIZE);

      if (batch.length === 0) break;

      // Advance cursor to last ID in batch so we never re-fetch the same rows
      cursorId = batch[batch.length - 1].id;

      const texts = batch.map((c) => this.composeContactText(c));

      const validIndices: number[] = [];
      const validTexts: string[] = [];
      for (let j = 0; j < texts.length; j++) {
        if (texts[j].trim().length > 0) {
          validIndices.push(j);
          validTexts.push(texts[j]);
        }
      }

      if (validTexts.length > 0) {
        try {
          const embeddings = await this.callBatchEmbeddingApi(validTexts, {
            actionType: "contact-embedding-backfill",
          });

          for (let j = 0; j < validIndices.length; j++) {
            const contact = batch[validIndices[j]];
            await this.db
              .update(schema.contacts)
              .set({ embedding: embeddings[j] })
              .where(eq(schema.contacts.id, contact.id));
          }

          totalProcessed += validTexts.length;
          this.logger.log(
            `Backfill: processed ${totalProcessed} contacts so far`
          );
        } catch (error) {
          this.logger.error(
            `EMBEDDING_SERVICE :: backfillAllContactEmbeddings : ERROR at cursor ${cursorId} : ${error}`
          );
          throw error;
        }
      }

      if (batch.length < PAGE_SIZE) break;

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.logger.log(
      `Backfill complete: generated embeddings for ${totalProcessed} contacts`
    );
  }

  /**
   * Generate embeddings for specific contacts that are missing them.
   * Used when computing matches for a user's contacts.
   */
  async ensureContactEmbeddings(
    contactIds: number[],
    tracking?: AiUsageTrackingData
  ): Promise<void> {
    if (contactIds.length === 0) return;

    const missingEmbeddings = await this.db
      .select({ id: schema.contacts.id })
      .from(schema.contacts)
      .where(
        and(
          inArray(schema.contacts.id, contactIds),
          isNull(schema.contacts.embedding),
          isNull(schema.contacts.deletedAt)
        )
      );

    const missingIds = missingEmbeddings.map((c) => c.id);
    if (missingIds.length > 0) {
      this.logger.log(
        `Generating embeddings for ${missingIds.length} contacts missing them`
      );
      await this.generateContactEmbeddings(missingIds, tracking);
    }
  }
}
