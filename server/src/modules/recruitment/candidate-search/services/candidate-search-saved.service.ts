import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { SAVED_SEARCH_CRITERIA_VERSION } from "database/schema/recruitment-saved-searches";
import { describeDbError } from "utils/db-error.utils";
import { toUTC } from "utils/dayjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { SavedSearchSummary } from "../candidate-search.response";
import { normalizeCriteria } from "../criteria/candidate-search-criteria.normalizer";

/**
 * Saved searches: personal, soft-deleted, and always re-normalised on read.
 *
 * The stored `criteria` is untrusted. It may have been written by an older
 * build, or predate a facet rename, so every read runs it through the same
 * normaliser as an inbound request — unknown keys are dropped rather than
 * thrown on. A search saved six months ago must degrade into a valid search,
 * never a 500 on someone's landing page.
 */
@Injectable()
export class CandidateSearchSavedService {
  private readonly logger = new Logger(CandidateSearchSavedService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async list(userId: string): Promise<SavedSearchSummary[]> {
    const table = schema.recruitmentSavedSearches;
    const rows = await this.db
      .select()
      .from(table)
      .where(and(eq(table.userId, userId), isNull(table.deletedAt)))
      // Favourites first, then most recently touched — the two orderings a
      // recruiter actually scans by.
      .orderBy(desc(table.isFavorite), desc(table.updatedAt));

    return rows.map((row) => this.toSummary(row));
  }

  async create(
    userId: string,
    input: {
      title: string;
      criteria: unknown;
      source?: string;
      resultCountAtSave?: number;
    }
  ): Promise<SavedSearchSummary> {
    const now = toUTC();
    // Normalised before storage as well as after: a search saved from a stale
    // client should not preserve fields the current build cannot read back.
    const criteria = normalizeCriteria(input.criteria);

    try {
      const [saved] = await this.db
        .insert(schema.recruitmentSavedSearches)
        .values({
          userId,
          title: input.title.trim(),
          criteria,
          criteriaVersion: SAVED_SEARCH_CRITERIA_VERSION,
          source:
            input.source === "job_description" ? "job_description" : "advanced",
          resultCountAtSave: input.resultCountAtSave ?? null,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      return this.toSummary(saved);
    } catch (error) {
      throw this.asDuplicateTitle(error, input.title);
    }
  }

  async rename(
    userId: string,
    id: string,
    title: string
  ): Promise<SavedSearchSummary> {
    try {
      const [updated] = await this.db
        .update(schema.recruitmentSavedSearches)
        .set({ title: title.trim(), updatedAt: toUTC(), updatedBy: userId })
        .where(this.ownRow(userId, id))
        .returning();

      if (!updated) throw new NotFoundException("Saved search not found");
      return this.toSummary(updated);
    } catch (error) {
      throw this.asDuplicateTitle(error, title);
    }
  }

  async setFavorite(
    userId: string,
    id: string,
    isFavorite: boolean
  ): Promise<SavedSearchSummary> {
    const [updated] = await this.db
      .update(schema.recruitmentSavedSearches)
      .set({ isFavorite, updatedAt: toUTC(), updatedBy: userId })
      .where(this.ownRow(userId, id))
      .returning();

    if (!updated) throw new NotFoundException("Saved search not found");
    return this.toSummary(updated);
  }

  /**
   * Records a rerun. Touches `last_run_at` only — not `updated_at`, so running
   * a search does not reshuffle a list ordered by when things were last edited.
   */
  async markRun(userId: string, id: string): Promise<SavedSearchSummary> {
    const [updated] = await this.db
      .update(schema.recruitmentSavedSearches)
      .set({ lastRunAt: toUTC() })
      .where(this.ownRow(userId, id))
      .returning();

    if (!updated) throw new NotFoundException("Saved search not found");
    return this.toSummary(updated);
  }

  /** Soft delete, which the partial unique index turns into "title freed for reuse". */
  async remove(userId: string, id: string): Promise<void> {
    const [deleted] = await this.db
      .update(schema.recruitmentSavedSearches)
      .set({ deletedAt: toUTC(), updatedBy: userId })
      .where(this.ownRow(userId, id))
      .returning({ id: schema.recruitmentSavedSearches.id });

    if (!deleted) throw new NotFoundException("Saved search not found");
  }

  /**
   * Ownership is the whole authorization story here: a saved search belongs to
   * one user, so every mutation filters on `user_id` rather than checking it
   * afterwards. A row that is not yours simply is not found.
   */
  private ownRow(userId: string, id: string) {
    const table = schema.recruitmentSavedSearches;
    return and(
      eq(table.id, id),
      eq(table.userId, userId),
      isNull(table.deletedAt)
    );
  }

  /**
   * Postgres reports a unique violation as SQLSTATE 23505 with the constraint
   * name attached; drizzle wraps that in an error whose own message is the
   * entire statement plus every bound parameter. Matching on the message
   * therefore both misses the conflict *and* risks that statement reaching the
   * client — so this walks the cause chain for the real error instead.
   */
  private asDuplicateTitle(error: unknown, title: string): Error {
    for (
      let cause: unknown = error, depth = 0;
      cause && depth < 5;
      depth += 1
    ) {
      const candidate = cause as {
        code?: string;
        constraint_name?: string;
        cause?: unknown;
      };
      if (
        candidate.code === "23505" &&
        candidate.constraint_name === "uniq_saved_search_user_title"
      ) {
        return new ConflictException(
          `You already have a saved search called “${title.trim()}”`
        );
      }
      cause = candidate.cause;
    }

    // Never rethrow the original: its message carries the statement and the
    // bound values, and this one goes out in a response body, not just a log.
    this.logger.error(
      `CANDIDATE_SEARCH_SAVED_SERVICE :: write : ERROR : ${describeDbError(error)}`,
      error instanceof Error ? error.stack : undefined
    );
    return new InternalServerErrorException("Could not save that search");
  }

  private toSummary(
    row: typeof schema.recruitmentSavedSearches.$inferSelect
  ): SavedSearchSummary {
    return {
      id: row.id,
      title: row.title,
      // Re-normalised on the way out, so a stale payload degrades into a valid
      // search instead of reaching the client as something it cannot apply.
      criteria: normalizeCriteria(row.criteria),
      source: row.source === "job_description" ? "job_description" : "advanced",
      resultCountAtSave: row.resultCountAtSave,
      isFavorite: row.isFavorite,
      lastRunAt: row.lastRunAt ? row.lastRunAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
