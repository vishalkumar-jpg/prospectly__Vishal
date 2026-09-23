import { Inject, Injectable } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";

export interface SaveResumeIndexInput {
  contactResumeId: string;
  /** Value read at load time; the write is rejected if the row moved since. */
  loadedUpdatedAt: Date;
  profileText: string;
  resumeText: string;
  embedding: number[];
  embeddingModel: string;
  searchDocHash: string;
}

@Injectable()
export class ResumeIndexingMutationRepository {
  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  /**
   * Guarded on contact_resumes.updated_at. Zero rows written means the source
   * row changed while the embedding call was in flight, so this result is
   * stale and must be discarded rather than persisted.
   *
   * Returns false in that case; the caller re-throws so BullMQ retries the job
   * against the current row.
   */
  async saveIndex(input: SaveResumeIndexInput): Promise<boolean> {
    const now = this.ts(toUTC());

    const result = await this.db.execute(sql`
      INSERT INTO ${schema.contactResumeSearch}
        (contact_resume_id, profile_text, resume_text,
         embedding, embedding_model, search_doc_hash,
         created_at, updated_at)
      SELECT ${input.contactResumeId}, ${input.profileText}, ${input.resumeText},
             ${this.toVectorLiteral(input.embedding)}::vector,
             ${input.embeddingModel}, ${input.searchDocHash}, ${now}, ${now}
      FROM ${schema.contactResumes} cr
      WHERE cr.id = ${input.contactResumeId}
        AND cr.updated_at = ${this.ts(input.loadedUpdatedAt)}
        AND cr.deleted_at IS NULL
      ON CONFLICT (contact_resume_id) DO UPDATE SET
        profile_text = EXCLUDED.profile_text,
        resume_text = EXCLUDED.resume_text,
        embedding = EXCLUDED.embedding,
        embedding_model = EXCLUDED.embedding_model,
        search_doc_hash = EXCLUDED.search_doc_hash,
        updated_at = EXCLUDED.updated_at,
        deleted_at = NULL
    `);

    return this.affectedRows(result) > 0;
  }

  /** Same guard, for the unchanged-hash path that skips the embedding call. */
  async touchUpdatedAt(
    contactResumeId: string,
    loadedUpdatedAt: Date
  ): Promise<boolean> {
    const now = this.ts(toUTC());

    const result = await this.db.execute(sql`
      UPDATE ${schema.contactResumeSearch} AS si
      SET updated_at = ${now}
      FROM ${schema.contactResumes} cr
      WHERE si.contact_resume_id = ${contactResumeId}
        AND si.deleted_at IS NULL
        AND cr.id = si.contact_resume_id
        AND cr.updated_at = ${this.ts(loadedUpdatedAt)}
        AND cr.deleted_at IS NULL
    `);

    return this.affectedRows(result) > 0;
  }

  async deleteByContactResumeId(contactResumeId: string): Promise<void> {
    await this.db
      .delete(schema.contactResumeSearch)
      .where(eq(schema.contactResumeSearch.contactResumeId, contactResumeId));
  }

  async deleteByMediaId(mediaId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: schema.contactResumes.id })
      .from(schema.contactResumes)
      .where(
        and(
          eq(schema.contactResumes.mediaId, mediaId),
          isNull(schema.contactResumes.deletedAt)
        )
      )
      .limit(1);

    if (row) await this.deleteByContactResumeId(row.id);
  }

  /**
   * Raw `sql` templates carry no column metadata, so drizzle hands a JS Date to
   * postgres-js unencoded and serialization throws ERR_INVALID_ARG_TYPE. Bind an
   * ISO string and let Postgres apply the cast. Every Date in this file must go
   * through here — the query builder is safe, raw templates are not.
   */
  private ts(value: Date): SQL {
    return sql`${value.toISOString()}::timestamptz`;
  }

  /**
   * pgvector rejects a number[] because postgres-js serialises it as an SQL
   * array literal. A string parameter infers as OID 0, letting the ::vector
   * cast resolve the type through vector_in.
   */
  private toVectorLiteral(embedding: number[]): string {
    const parts = embedding.map((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new Error("Non-finite value in resume embedding");
      }
      return numeric.toString();
    });

    return `[${parts.join(",")}]`;
  }

  /**
   * postgres-js returns an Array subclass carrying `count` — the rows the
   * statement actually affected. `length` is the number of rows *returned*,
   * which is 0 for a write with no RETURNING, so `count` must be read first or
   * every successful write looks like a rejected one.
   */
  private affectedRows(result: unknown): number {
    const count = (result as { count?: number } | null)?.count;
    if (typeof count === "number") return count;
    return Array.isArray(result) ? result.length : 0;
  }
}
