import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import { mergeUniqueTrimmedStrings } from "utils/helper.utils";
import type { ResumeExtractionParsed } from "./resume-extraction-ai.service";
import { normalizeEducationLevel } from "../resume-education-level.normalizer";

function skillsArrayFromJsonb(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string") out.push(item);
  }
  return out;
}

export interface SaveResumeExtractionInput extends ResumeExtractionParsed {
  mediaId: string;
  /** Linked registered candidate when known; connector uploads often omit this. */
  candidateId?: string;
  contactId?: number;
  userId: string;
}

type DrizzleTransaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];

@Injectable()
export class ResumeExtractionMutationService {
  private readonly logger = new Logger(ResumeExtractionMutationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>
  ) {}

  async saveExtraction(input: SaveResumeExtractionInput): Promise<void> {
    const now = toUTC();
    const skillsJson = input.skills.length > 0 ? input.skills : null;
    // Derived here rather than in the search query: the degrees are free text an
    // AI wrote, and normalising once at write time keeps the filter exact.
    const educationLevel = normalizeEducationLevel(input.metadata);

    await this.db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(schema.contactResumes)
        .values({
          mediaId: input.mediaId,
          candidateId: input.candidateId ?? null,
          contactId: input.contactId ?? null,
          uploadedBy: input.userId,
          jobTitle: input.jobTitle?.trim() || null,
          skills: skillsJson,
          totalYearsExp:
            input.totalYearsExp != null &&
            String(input.totalYearsExp).trim() !== ""
              ? input.totalYearsExp
              : null,
          aiSummary: input.aiSummary,
          metadata: input.metadata,
          educationLevel,
          createdAt: now,
          updatedAt: now,
          createdBy: input.userId,
          updatedBy: input.userId,
        })
        .onConflictDoUpdate({
          target: schema.contactResumes.mediaId,
          set: {
            candidateId: input.candidateId ?? null,
            contactId: input.contactId ?? null,
            uploadedBy: input.userId,
            jobTitle: input.jobTitle?.trim() || null,
            skills: skillsJson,
            totalYearsExp:
              input.totalYearsExp != null &&
              String(input.totalYearsExp).trim() !== ""
                ? input.totalYearsExp
                : null,
            aiSummary: input.aiSummary,
            metadata: input.metadata,
            educationLevel,
            updatedAt: now,
            updatedBy: input.userId,
          },
        })
        .returning({ id: schema.contactResumes.id });

      // The stored vector was derived from the previous extraction. Dropping it
      // in the same transaction means search never sees an index row that
      // disagrees with the row's structured fields; the producers re-enqueue
      // indexing after this commits.
      if (saved?.id) {
        await tx
          .delete(schema.contactResumeSearch)
          .where(eq(schema.contactResumeSearch.contactResumeId, saved.id));
      }

      if (input.contactId != null && input.skills.length > 0) {
        await this.mergeContactSkills(tx, input.contactId, input.skills, now);
      }
    });
  }

  private async mergeContactSkills(
    tx: DrizzleTransaction,
    contactId: number,
    newSkills: string[],
    now: Date
  ): Promise<void> {
    const contactWhere = and(
      eq(schema.contacts.id, contactId),
      isNull(schema.contacts.deletedAt)
    );

    const [row] = await tx
      .select({ skills: schema.contacts.skills })
      .from(schema.contacts)
      .where(contactWhere)
      .limit(1);

    const existing = skillsArrayFromJsonb(row?.skills);
    const merged = mergeUniqueTrimmedStrings([...existing, ...newSkills]);

    await tx
      .update(schema.contacts)
      .set({
        skills: merged,
        updatedAt: now,
      })
      .where(contactWhere);

    this.logger.log(
      `RESUME_EXTRACTION_MUTATION :: mergeContactSkills : contactId=${contactId} count=${merged.length}`
    );
  }
}
