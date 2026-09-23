import { Injectable, Logger } from "@nestjs/common";
import { UnrecoverableError } from "bullmq";
import { S3Service } from "shared/s3.service";
import type { ResumeExtractionParsed } from "../../resume-extraction/services/resume-extraction-ai.service";
import type { ResumeIndexingJobPayload } from "../resume-indexing-queue.service";
import { ResumePdfTextService } from "./resume-pdf-text.service";
import { ResumeIndexingQueryRepository } from "./resume-indexing-query.repository";
import { ResumeIndexingMutationRepository } from "./resume-indexing-mutation.repository";
import { ResumeFacetRollupService } from "./resume-facet-rollup.service";
import { EmbeddingService } from "../../job-pool-matches/services/embedding.service";
import { ResumeTextService } from "../../candidate-evaluation/services/resume-text.service";
import {
  buildEmbeddingDocument,
  buildProfileText,
  hashSearchDocument,
} from "../document/resume-search-document.builder";
import { resolveResumeText } from "../document/resume-text.resolver";
import {
  formatRedactionCounts,
  stripResumePii,
} from "../pii/resume-pii-redactor";
import { RESUME_EMBEDDING_MODEL } from "../resume-indexing.constants";

/**
 * Thrown when contact_resumes changed while the embedding call was in flight.
 * Deliberately a plain Error so BullMQ retries and re-reads the current row.
 */
class StaleResumeIndexError extends Error {
  constructor(mediaId: string) {
    super(`Resume changed during indexing, retrying (mediaId: ${mediaId})`);
    this.name = "StaleResumeIndexError";
  }
}

@Injectable()
export class ResumeIndexingRunnerService {
  private readonly logger = new Logger(ResumeIndexingRunnerService.name);

  constructor(
    private readonly s3: S3Service,
    private readonly pdfText: ResumePdfTextService,
    private readonly resumeText: ResumeTextService,
    private readonly embedding: EmbeddingService,
    private readonly query: ResumeIndexingQueryRepository,
    private readonly mutation: ResumeIndexingMutationRepository,
    private readonly facetRollup: ResumeFacetRollupService
  ) {}

  async indexOne(payload: ResumeIndexingJobPayload): Promise<void> {
    const { mediaId, force, userId } = payload;

    const row = await this.query.findByMediaId(mediaId);
    if (!row) {
      throw new UnrecoverableError(
        `Resume row not found or soft-deleted (mediaId: ${mediaId})`
      );
    }

    const hints = await this.query.loadPiiHints(row);

    const extracted = row.filePath
      ? await this.extractPdfText(row.filePath, mediaId)
      : "";

    const summary = row.aiSummary
      ? stripResumePii(row.aiSummary, hints).text
      : "";

    const resolved = resolveResumeText({
      extractedRaw: extracted,
      structuredFallback: this.buildStructuredFallback(row),
      summary,
      hints,
    });

    // Structured extraction fields are professional by intent, not by
    // guarantee — Gemini can drop a name into `certifications` or a phone into
    // a metadata array, and this half of the document is both stored and
    // embedded. Label heuristics are off: the profile *is* a labelled document,
    // so they would eat legitimate values like "Contact-Center Operations".
    const profile = stripResumePii(
      buildProfileText({
        jobTitle: row.jobTitle,
        totalYearsExp: row.totalYearsExp,
        skills: row.skills,
        metadata: row.metadata,
      }),
      hints,
      { skipLabelHeuristics: true }
    );
    const profileText = profile.text;

    const embedDoc = buildEmbeddingDocument(profileText, resolved.text);
    if (!embedDoc.trim()) {
      this.logger.warn(
        `RESUME_INDEXING_RUNNER :: indexOne : EMPTY_DOCUMENT : mediaId=${mediaId}`
      );
      return;
    }

    const hash = hashSearchDocument(embedDoc);
    const unchanged =
      !force &&
      row.hasEmbedding &&
      row.existingHash === hash &&
      row.existingEmbeddingModel === RESUME_EMBEDDING_MODEL;

    if (unchanged) {
      const touched = await this.mutation.touchUpdatedAt(
        row.contactResumeId,
        row.updatedAt
      );
      if (!touched) throw new StaleResumeIndexError(mediaId);
      return;
    }

    const [embedding] = await this.embedding.embedTexts(
      [embedDoc],
      { taskType: "RETRIEVAL_DOCUMENT" },
      { userId, actionType: "resume-index-embedding" }
    );

    if (!embedding?.length) {
      throw new Error(`Empty embedding returned (mediaId: ${mediaId})`);
    }

    const saved = await this.mutation.saveIndex({
      contactResumeId: row.contactResumeId,
      loadedUpdatedAt: row.updatedAt,
      profileText,
      resumeText: resolved.text,
      embedding,
      embeddingModel: RESUME_EMBEDDING_MODEL,
      searchDocHash: hash,
    });

    if (!saved) throw new StaleResumeIndexError(mediaId);

    // The facet counts are aggregated from the same four résumé fields this
    // write just indexed, so they are stale the moment it commits. After the
    // write, never inside it: the rollup reads the row it depends on, and it
    // must not be able to fail an index that already landed (§4.3).
    await this.facetRollup.recomputeForResume({
      candidateId: row.candidateId,
      contactId: row.contactId,
    });

    if (resolved.highRemoval) {
      this.logger.warn(
        `RESUME_INDEXING_RUNNER :: indexOne : HIGH_REDACTION_RATIO : mediaId=${mediaId}`
      );
    }

    // Counts only — the redacted values are the PII.
    this.logger.log(
      `RESUME_INDEXING_RUNNER :: indexOne : mediaId=${mediaId} source=${resolved.source} chars=${resolved.text.length} ${formatRedactionCounts(resolved.redactions)} profile=[${formatRedactionCounts(profile.redactions)}]`
    );
  }

  private async extractPdfText(
    filePath: string,
    mediaId: string
  ): Promise<string> {
    let buffer: Buffer;
    try {
      buffer = await this.s3.downloadObject(filePath);
    } catch (error) {
      // A missing object never becomes available on retry, and the structured
      // fallback still yields a usable index, so this is not fatal.
      this.logger.warn(
        `RESUME_INDEXING_RUNNER :: extractPdfText : S3_DOWNLOAD_FAILED : mediaId=${mediaId} ${error}`
      );
      return "";
    }

    const result = await this.pdfText.extract(buffer, mediaId);
    return result.text;
  }

  private buildStructuredFallback(row: {
    jobTitle: string | null;
    skills: unknown;
    totalYearsExp: string | null;
    aiSummary: string | null;
    metadata: unknown;
  }): string {
    const parsed: ResumeExtractionParsed = {
      jobTitle: row.jobTitle ?? "",
      skills: Array.isArray(row.skills)
        ? row.skills.filter((s): s is string => typeof s === "string")
        : [],
      totalYearsExp: row.totalYearsExp,
      aiSummary: row.aiSummary ?? "",
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as ResumeExtractionParsed["metadata"])
          : {},
    };

    return this.resumeText.buildResumeText(parsed);
  }
}
