import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, asc, eq, gt, isNull, sql, type SQL } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { PiiHints } from "../pii/resume-pii-redactor";

export interface ResumeIndexingRow {
  contactResumeId: string;
  mediaId: string;
  candidateId: string | null;
  contactId: number | null;
  jobTitle: string | null;
  skills: unknown;
  totalYearsExp: string | null;
  aiSummary: string | null;
  metadata: unknown;
  /** Optimistic-concurrency token for the guarded write. */
  updatedAt: Date;
  filePath: string | null;
  existingHash: string | null;
  existingEmbeddingModel: string | null;
  hasEmbedding: boolean;
}

export interface BackfillScanRow {
  contactResumeId: string;
  mediaId: string;
}

function pushIfString(target: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) target.push(value.trim());
}

function collectNames(value: unknown, target: string[]): void {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  pushIfString(target, record.firstName);
  pushIfString(target, record.lastName);
  pushIfString(target, record.phone);
  pushIfString(target, record.linkedinUrl);

  const first = typeof record.firstName === "string" ? record.firstName : "";
  const last = typeof record.lastName === "string" ? record.lastName : "";
  if (first && last) target.push(`${first} ${last}`);
}

@Injectable()
export class ResumeIndexingQueryRepository {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async findByMediaId(mediaId: string): Promise<ResumeIndexingRow | null> {
    const [row] = await this.db
      .select({
        contactResumeId: schema.contactResumes.id,
        mediaId: schema.contactResumes.mediaId,
        candidateId: schema.contactResumes.candidateId,
        contactId: schema.contactResumes.contactId,
        jobTitle: schema.contactResumes.jobTitle,
        skills: schema.contactResumes.skills,
        totalYearsExp: schema.contactResumes.totalYearsExp,
        aiSummary: schema.contactResumes.aiSummary,
        metadata: schema.contactResumes.metadata,
        updatedAt: schema.contactResumes.updatedAt,
        filePath: schema.mediaSchema.filePath,
        existingHash: schema.contactResumeSearch.searchDocHash,
        existingEmbeddingModel: schema.contactResumeSearch.embeddingModel,
        hasEmbedding: sql<boolean>`${schema.contactResumeSearch.embedding} IS NOT NULL`,
      })
      .from(schema.contactResumes)
      .leftJoin(
        schema.mediaSchema,
        eq(schema.mediaSchema.id, schema.contactResumes.mediaId)
      )
      .leftJoin(
        schema.contactResumeSearch,
        and(
          eq(
            schema.contactResumeSearch.contactResumeId,
            schema.contactResumes.id
          ),
          isNull(schema.contactResumeSearch.deletedAt)
        )
      )
      .where(
        and(
          eq(schema.contactResumes.mediaId, mediaId),
          isNull(schema.contactResumes.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  /**
   * Names and contact strings the redactor is allowed to remove, plus the
   * professional terms it must never touch even when they collide with a name.
   */
  async loadPiiHints(row: ResumeIndexingRow): Promise<PiiHints> {
    const names: string[] = [];
    const protectedTerms: string[] = [];

    if (row.candidateId) {
      const [user] = await this.db
        .select({
          fullName: schema.users.fullName,
          email: schema.users.email,
        })
        .from(schema.recruitmentJobCandidates)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.recruitmentJobCandidates.candidateUserId)
        )
        .where(eq(schema.recruitmentJobCandidates.id, row.candidateId))
        .limit(1);

      if (user) {
        pushIfString(names, user.fullName);
        pushIfString(names, user.email);
      }
    }

    if (row.contactId != null) {
      const [contact] = await this.db
        .select({
          firstName: schema.contacts.firstName,
          lastName: schema.contacts.lastName,
          email: schema.contacts.email,
          phoneNumber: schema.contacts.phoneNumber,
          linkedin: schema.contacts.linkedin,
        })
        .from(schema.contacts)
        .where(eq(schema.contacts.id, row.contactId))
        .limit(1);

      if (contact) {
        pushIfString(names, contact.firstName);
        pushIfString(names, contact.lastName);
        pushIfString(names, contact.email);
        pushIfString(names, contact.phoneNumber);
        pushIfString(names, contact.linkedin);
        if (contact.firstName && contact.lastName) {
          names.push(`${contact.firstName} ${contact.lastName}`);
        }
      }
    }

    const metadata =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {};

    collectNames(metadata.contactInfo, names);

    if (Array.isArray(row.skills)) {
      for (const skill of row.skills) pushIfString(protectedTerms, skill);
    }
    for (const key of ["tools", "technologies", "domainExpertise"]) {
      const value = metadata[key];
      if (!Array.isArray(value)) continue;
      for (const item of value) pushIfString(protectedTerms, item);
    }
    if (Array.isArray(metadata.jobHistory)) {
      for (const item of metadata.jobHistory) {
        if (item && typeof item === "object") {
          pushIfString(
            protectedTerms,
            (item as Record<string, unknown>).company
          );
        }
      }
    }
    if (Array.isArray(metadata.education)) {
      for (const item of metadata.education) {
        if (item && typeof item === "object") {
          pushIfString(
            protectedTerms,
            (item as Record<string, unknown>).institution
          );
        }
      }
    }
    pushIfString(protectedTerms, metadata.currentEmployer);

    return { names, protectedTerms };
  }

  /**
   * Keyset pagination on the uuid primary key, which is total-ordered in
   * Postgres, so a scan is stable and resumable across worker restarts.
   */
  async scanForBackfill(params: {
    cursor: string | null;
    pageSize: number;
    force: boolean;
    /** Null sweeps the whole corpus, which is the original behaviour. */
    jobId: string | null;
  }): Promise<BackfillScanRow[]> {
    const conditions = [isNull(schema.contactResumes.deletedAt)];

    if (params.cursor) {
      conditions.push(gt(schema.contactResumes.id, params.cursor));
    }

    if (!params.force) {
      conditions.push(isNull(schema.contactResumeSearch.id));
    }

    if (params.jobId) {
      conditions.push(this.belongsToJob(params.jobId));
    }

    return this.db
      .select({
        contactResumeId: schema.contactResumes.id,
        mediaId: schema.contactResumes.mediaId,
      })
      .from(schema.contactResumes)
      .leftJoin(
        schema.contactResumeSearch,
        and(
          eq(
            schema.contactResumeSearch.contactResumeId,
            schema.contactResumes.id
          ),
          isNull(schema.contactResumeSearch.deletedAt)
        )
      )
      .where(and(...conditions))
      .orderBy(asc(schema.contactResumes.id))
      .limit(params.pageSize);
  }

  /**
   * The two ways a job reaches a resume: through a candidate on the job, or
   * through a connector's pre-referral pool match, which is still a contact.
   * Both are needed — the connector board searches pool matches, so omitting
   * them would leave its pre-referral columns unindexed.
   *
   * EXISTS rather than joins, deliberately. One contact can hold several pool
   * matches on the same job (one per connector) and a consented contact is
   * reachable both ways at once, so a join would emit the same resume row
   * repeatedly — double-enqueuing it and, worse, breaking the keyset paging
   * this scan depends on. EXISTS yields each resume exactly once.
   *
   * The `candidate_id IS NULL` guard on the contact fallback is load-bearing:
   * without it, a resume already bound to a different job's candidate would be
   * pulled in through a shared contact.
   */
  private belongsToJob(jobId: string): SQL {
    const { candidateId, contactId } = schema.contactResumes;

    return sql`(
      EXISTS (
        SELECT 1
        FROM ${schema.recruitmentJobCandidates} jc
        WHERE jc.job_id = ${jobId}
          AND jc.deleted_at IS NULL
          AND (
            ${candidateId} = jc.id
            OR (${candidateId} IS NULL AND ${contactId} = jc.contact_id)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM ${schema.recruitmentJobPoolMatches} pm
        WHERE pm.job_id = ${jobId}
          AND pm.deleted_at IS NULL
          AND ${contactId} = pm.contact_id
      )
    )`;
  }
}
