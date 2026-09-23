import { Injectable, Inject, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull, ne, sql } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { EmbeddingService } from "./embedding.service";
import { LlmScoringService, LlmScoringResult } from "./llm-scoring.service";
import {
  TOP_CANDIDATES_PER_JOB,
  MIN_LLM_SCORE_THRESHOLD,
  MIN_COSINE_SIMILARITY,
  JOB_POOL_MATCH_SOURCE,
  JOB_POOL_MATCH_STATUS,
} from "../job-pool-matches.constants";

interface CandidateRow {
  contactId: number;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  company: string | null;
  skills: unknown;
  connectorUserId: string;
  cosineSimilarity: number;
}

@Injectable()
export class JobPoolMatchesComputeService {
  private readonly logger = new Logger(JobPoolMatchesComputeService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly embeddingService: EmbeddingService,
    private readonly llmScoringService: LlmScoringService
  ) {}

  async computeMatchesForJob(jobId: string): Promise<void> {
    // Stage 0: Fetch job
    const [job] = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        description: schema.recruitmentJobsSchema.description,
        experienceLevel: schema.recruitmentJobsSchema.experienceLevel,
        requiredSkills: schema.recruitmentJobsSchema.requiredSkills,
        preferredSkills: schema.recruitmentJobsSchema.preferredSkills,
        requirements: schema.recruitmentJobsSchema.requirements,
        requesterId: schema.recruitmentJobsSchema.requesterId,
        status: schema.recruitmentJobsSchema.status,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.id, jobId),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      )
      .limit(1);

    if (!job || job.status !== "active") {
      this.logger.warn(
        `Job ${jobId} not found or not active (status=${job?.status}), skipping match computation`
      );
      return;
    }

    // Stage 1: Generate job embedding
    let jobEmbedding: number[];
    try {
      jobEmbedding = await this.embeddingService.generateJobEmbedding(jobId);
      this.logger.log(
        `Stage 1: Job embedding ready (${jobEmbedding.length} dimensions)`
      );
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_COMPUTE :: computeMatchesForJob : EMBEDDING_ERROR : ${error}`
      );
      throw error;
    }

    // Stage 2: pgvector similarity search
    let topCandidates: CandidateRow[];
    try {
      topCandidates = await this.findTopCandidatesByEmbedding(
        jobEmbedding,
        job.requesterId,
        jobId,
        undefined,
        true
      );
      this.logger.log(
        `Stage 2: Found ${topCandidates.length} candidates via pgvector for job ${jobId}`
      );
    } catch (error) {
      const err = error as Error & Record<string, unknown>;
      this.logger.error(
        `JOB_POOL_MATCHES_COMPUTE :: computeMatchesForJob : PGVECTOR_SEARCH_ERROR : ${err.message}`
      );
      // Log the full error including nested cause chain
      if (err.cause) {
        this.logger.error(`  cause: ${err.cause}`);
      }
      // Log all enumerable properties for pg driver errors
      const props = Object.keys(err).filter(
        (k) => k !== "stack" && k !== "message"
      );
      if (props.length > 0) {
        const details = props.map((k) => `${k}=${err[k]}`).join(", ");
        this.logger.error(`  error props: ${details}`);
      }
      throw error;
    }

    if (topCandidates.length === 0) {
      // Title/skills rematch: clear stale system Qualified when nobody matches.
      await this.softDeleteRefreshableAiMatches(jobId);
      this.logger.log(`No embedding-matched contacts found for job ${jobId}`);
      return;
    }

    // Stage 3: LLM scoring of top candidates
    const candidatesForScoring = topCandidates.map((c, i) => ({
      candidateIndex: i,
      firstName: c.firstName,
      lastName: c.lastName,
      title: c.title,
      company: c.company,
      skills: c.skills as string[] | null,
      cosineSimilarity: Number(c.cosineSimilarity),
    }));

    let llmResults: LlmScoringResult[];
    try {
      llmResults = await this.llmScoringService.scoreCandidates(
        {
          title: job.title,
          companyName: job.companyName,
          description: job.description,
          experienceLevel: job.experienceLevel,
          requiredSkills: job.requiredSkills as string[] | null,
          preferredSkills: job.preferredSkills as string[] | null,
          requirements: job.requirements,
        },
        candidatesForScoring,
        {
          userId: job.requesterId,
          actionType: "job-pool-llm-scoring",
        }
      );
      this.logger.log(
        `Stage 3: LLM scored ${llmResults.length} candidates for job ${jobId}`
      );
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_COMPUTE :: computeMatchesForJob : LLM_SCORING_ERROR : ${error}`
      );
      throw error;
    }

    // Build a map of candidateIndex -> LLM result
    const llmResultMap = new Map<number, LlmScoringResult>();
    for (const result of llmResults) {
      llmResultMap.set(result.candidateIndex, result);
    }

    // Store matches (only those above threshold)
    const now = toUTC();
    const matchRows: schema.NewRecruitmentJobPoolMatch[] = [];

    for (let i = 0; i < topCandidates.length; i++) {
      const candidate = topCandidates[i];
      const llmResult = llmResultMap.get(i);
      const llmScore = llmResult?.score ?? 0;

      if (llmScore < MIN_LLM_SCORE_THRESHOLD) continue;

      matchRows.push({
        jobId: job.id,
        contactId: candidate.contactId,
        connectorUserId: candidate.connectorUserId,
        matchScore: String(llmScore),
        cosineSimilarity: String(candidate.cosineSimilarity),
        llmScore: String(llmScore),
        matchedSignals: llmResult?.matchedSignals ?? [],
        concerns: llmResult?.concerns ?? [],
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Soft-delete previous system Qualified (ai_matched + pending) only.
    // Consent / applied / connector-uploaded rows are never touched.
    await this.softDeleteRefreshableAiMatches(jobId);

    if (matchRows.length === 0) {
      this.logger.log(`No matches above threshold for job ${jobId}`);
      return;
    }

    // Stage 4: Upsert matches (restores soft-deleted rows that still qualify)
    try {
      await this.upsertMatches(matchRows, now);
      this.logger.log(
        `Stage 4: Upserted ${matchRows.length} matches for job ${jobId}`
      );
    } catch (error) {
      this.logger.error(
        `JOB_POOL_MATCHES_COMPUTE :: computeMatchesForJob : UPSERT_ERROR : ${error}`
      );
      throw error;
    }
  }

  async computeMatchesForUserContacts(userId: string): Promise<void> {
    // Get user's contact IDs
    const userContacts = await this.db
      .select({
        contactId: schema.contacts.id,
      })
      .from(schema.contacts)
      .innerJoin(
        schema.contactRelationships,
        eq(schema.contacts.id, schema.contactRelationships.contactId)
      )
      .where(
        and(
          eq(schema.contactRelationships.userId, userId),
          isNull(schema.contacts.deletedAt),
          sql`${schema.contacts.email} IS NOT NULL AND ${schema.contacts.email} != ''`
        )
      );

    if (userContacts.length === 0) {
      this.logger.log(`No contacts with email found for user ${userId}`);
      return;
    }

    const contactIds = userContacts.map((c) => c.contactId);

    // Ensure all user's contacts have embeddings
    await this.embeddingService.ensureContactEmbeddings(contactIds, {
      userId,
      actionType: "job-pool-user-contacts-embedding",
    });

    // Fetch active jobs where requesterId != userId
    const activeJobs = await this.db
      .select({
        id: schema.recruitmentJobsSchema.id,
        title: schema.recruitmentJobsSchema.title,
        companyName: schema.recruitmentJobsSchema.companyName,
        description: schema.recruitmentJobsSchema.description,
        experienceLevel: schema.recruitmentJobsSchema.experienceLevel,
        requiredSkills: schema.recruitmentJobsSchema.requiredSkills,
        preferredSkills: schema.recruitmentJobsSchema.preferredSkills,
        requirements: schema.recruitmentJobsSchema.requirements,
      })
      .from(schema.recruitmentJobsSchema)
      .where(
        and(
          eq(schema.recruitmentJobsSchema.status, "active"),
          ne(schema.recruitmentJobsSchema.requesterId, userId),
          isNull(schema.recruitmentJobsSchema.deletedAt)
        )
      );

    if (activeJobs.length === 0) {
      this.logger.log(`No active jobs found for user ${userId} contacts`);
      return;
    }

    const now = toUTC();
    let totalMatches = 0;

    for (const job of activeJobs) {
      // Generate job embedding if not exists
      const jobEmbedding = await this.embeddingService.generateJobEmbedding(
        job.id
      );

      // pgvector search limited to this user's contacts
      const topCandidates = await this.findTopCandidatesByEmbedding(
        jobEmbedding,
        userId, // exclude requester (this is the connector user, but we pass userId to exclude self-matches)
        job.id,
        contactIds // limit to user's contacts
      );

      if (topCandidates.length === 0) continue;

      const candidatesForScoring = topCandidates.map((c, i) => ({
        candidateIndex: i,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        company: c.company,
        skills: c.skills as string[] | null,
        cosineSimilarity: Number(c.cosineSimilarity),
      }));

      const llmResults = await this.llmScoringService.scoreCandidates(
        {
          title: job.title,
          companyName: job.companyName,
          description: job.description,
          experienceLevel: job.experienceLevel,
          requiredSkills: job.requiredSkills as string[] | null,
          preferredSkills: job.preferredSkills as string[] | null,
          requirements: job.requirements,
        },
        candidatesForScoring,
        { userId, actionType: "job-pool-llm-scoring" }
      );

      const llmResultMap = new Map<number, LlmScoringResult>();
      for (const result of llmResults) {
        llmResultMap.set(result.candidateIndex, result);
      }

      const matchRows: schema.NewRecruitmentJobPoolMatch[] = [];

      for (let i = 0; i < topCandidates.length; i++) {
        const candidate = topCandidates[i];
        const llmResult = llmResultMap.get(i);
        const llmScore = llmResult?.score ?? 0;

        if (llmScore < MIN_LLM_SCORE_THRESHOLD) continue;

        matchRows.push({
          jobId: job.id,
          contactId: candidate.contactId,
          connectorUserId: candidate.connectorUserId,
          matchScore: String(llmScore),
          cosineSimilarity: String(candidate.cosineSimilarity),
          llmScore: String(llmScore),
          matchedSignals: llmResult?.matchedSignals ?? [],
          concerns: llmResult?.concerns ?? [],
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }

      if (matchRows.length > 0) {
        await this.upsertMatches(matchRows, now);
        totalMatches += matchRows.length;
      }
    }

    this.logger.log(
      `Computed ${totalMatches} matches for user ${userId} contacts across ${activeJobs.length} jobs`
    );
  }

  /**
   * pgvector cosine similarity search to find top candidate contacts.
   * Uses raw SQL to avoid Drizzle ORM issues with pgvector operators.
   *
   * @param refreshPendingAiMatches When true, existing system Qualified
   *   (`ai_matched` + `pending`) may be re-selected for re-scoring. Consent,
   *   applied, and connector-uploaded rows remain excluded.
   */
  private async findTopCandidatesByEmbedding(
    jobEmbedding: number[],
    requesterId: string,
    jobId: string,
    limitToContactIds?: number[],
    refreshPendingAiMatches = false
  ): Promise<CandidateRow[]> {
    // Must use sql.raw for the vector literal — parameterized $N::vector doesn't work with pgvector
    const embeddingLiteral = `'[${jobEmbedding.join(",")}]'::vector`;

    let contactFilter = "";
    if (limitToContactIds && limitToContactIds.length > 0) {
      contactFilter = `AND c.id IN (${limitToContactIds.join(",")})`;
    }

    const existingMatchExclusion = refreshPendingAiMatches
      ? sql`
        AND (c.id, cr.user_id) NOT IN (
          SELECT rjpm.contact_id, rjpm.connector_user_id
          FROM prospectly.recruitment_job_pool_matches rjpm
          WHERE rjpm.job_id = ${jobId}
            AND rjpm.deleted_at IS NULL
            AND NOT (
              rjpm.source = ${JOB_POOL_MATCH_SOURCE.AI_MATCHED}
              AND rjpm.status = ${JOB_POOL_MATCH_STATUS.PENDING}
            )
        )
      `
      : sql`
        AND (c.id, cr.user_id) NOT IN (
          SELECT rjpm.contact_id, rjpm.connector_user_id
          FROM prospectly.recruitment_job_pool_matches rjpm
          WHERE rjpm.job_id = ${jobId} AND rjpm.deleted_at IS NULL
        )
      `;

    const result = await this.db.execute(sql`
      SELECT
        c.id AS "contactId",
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.title,
        c.company,
        c.skills,
        cr.user_id AS "connectorUserId",
        1 - (c.embedding <=> ${sql.raw(embeddingLiteral)}) AS "cosineSimilarity"
      FROM prospectly.contacts c
      INNER JOIN prospectly.contact_relationships cr ON c.id = cr.contact_id
      WHERE c.embedding IS NOT NULL
        AND c.deleted_at IS NULL
        AND cr.user_id != ${requesterId}
        AND c.email IS NOT NULL AND c.email != ''
        AND 1 - (c.embedding <=> ${sql.raw(embeddingLiteral)}) > ${MIN_COSINE_SIMILARITY}
        AND c.id NOT IN (
          SELECT rjc.contact_id FROM prospectly.recruitment_job_candidates rjc
          WHERE rjc.job_id = ${jobId} AND rjc.deleted_at IS NULL
        )
        ${existingMatchExclusion}
        ${sql.raw(contactFilter)}
      ORDER BY "cosineSimilarity" DESC
      LIMIT ${TOP_CANDIDATES_PER_JOB}
    `);

    // Handle both array-like and { rows } return types from postgres-js driver
    const rows = Array.isArray(result)
      ? result
      : ((result as Record<string, unknown>).rows as unknown[]) || [];

    return rows as CandidateRow[];
  }

  /**
   * Soft-delete system Qualified only (`ai_matched` + `pending`).
   * Never touches consent / applied / connector-uploaded rows.
   */
  private async softDeleteRefreshableAiMatches(jobId: string): Promise<void> {
    const now = toUTC();
    await this.db
      .update(schema.recruitmentJobPoolMatches)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.recruitmentJobPoolMatches.jobId, jobId),
          eq(
            schema.recruitmentJobPoolMatches.source,
            JOB_POOL_MATCH_SOURCE.AI_MATCHED
          ),
          eq(
            schema.recruitmentJobPoolMatches.status,
            JOB_POOL_MATCH_STATUS.PENDING
          ),
          isNull(schema.recruitmentJobPoolMatches.deletedAt)
        )
      );
  }

  /**
   * Batch upsert match rows in chunks of 500.
   */
  private async upsertMatches(
    matchRows: schema.NewRecruitmentJobPoolMatch[],
    now: Date
  ): Promise<void> {
    const BATCH_SIZE = 500;
    for (let i = 0; i < matchRows.length; i += BATCH_SIZE) {
      const batch = matchRows.slice(i, i + BATCH_SIZE);
      await this.db
        .insert(schema.recruitmentJobPoolMatches)
        .values(batch)
        .onConflictDoUpdate({
          target: [
            schema.recruitmentJobPoolMatches.jobId,
            schema.recruitmentJobPoolMatches.contactId,
            schema.recruitmentJobPoolMatches.connectorUserId,
          ],
          set: {
            matchScore: sql`excluded.match_score`,
            cosineSimilarity: sql`excluded.cosine_similarity`,
            llmScore: sql`excluded.llm_score`,
            matchedSignals: sql`excluded.matched_signals`,
            concerns: sql`excluded.concerns`,
            status: JOB_POOL_MATCH_STATUS.PENDING,
            source: JOB_POOL_MATCH_SOURCE.AI_MATCHED,
            deletedAt: null,
            updatedAt: now,
          },
          // Never overwrite consent / connector-uploaded / applied-adjacent rows.
          setWhere: sql`(
            ${schema.recruitmentJobPoolMatches.deletedAt} IS NOT NULL
            OR (
              ${schema.recruitmentJobPoolMatches.source} = ${JOB_POOL_MATCH_SOURCE.AI_MATCHED}
              AND ${schema.recruitmentJobPoolMatches.status} = ${JOB_POOL_MATCH_STATUS.PENDING}
            )
          )`,
        });
    }
  }
}
