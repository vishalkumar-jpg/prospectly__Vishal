import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import { MediaService } from "modules/media/media.service";
import { MediaModules, MediaType } from "modules/media/media.constants";
import { ResumeExtractionQueueService } from "modules/recruitment/resume-extraction/resume-extraction-queue.service";
import { CANDIDATE_EVALUATION_CONFIG } from "modules/recruitment/candidate-evaluation/candidate-evaluation.constants";
import { CandidateConnectorsService } from "modules/recruitment/candidate-connectors/candidate-connectors.service";
import { persistCandidateAssessmentResponses } from "modules/recruitment/assessment-bank/candidate-response/candidate-response.persistence";
import { upsertContactLinkedin } from "utils/linkedin-contact.persist";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import { getPayoutCurrencyForCountry } from "config/payment.config";
import crypto from "node:crypto";
import { CandidatesContactService } from "./candidates-contact.service";
import { ApplyToJobDto } from "../candidates.dto";
import { CANDIDATES_MESSAGES } from "../candidates.constants";

@Injectable()
export class CandidatesMutationService {
  private readonly logger = new Logger(CandidatesMutationService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly contactService: CandidatesContactService,
    private readonly mediaService: MediaService,
    private readonly resumeExtractionQueueService: ResumeExtractionQueueService,
    private readonly candidateConnectorsService: CandidateConnectorsService
  ) {}

  async apply(userId: string, dto: ApplyToJobDto) {
    const now = toUTC();

    const txResult = await this.db.transaction(async (tx) => {
      // 1. Validate job exists and is active
      const [job] = await tx
        .select()
        .from(schema.recruitmentJobsSchema)
        .where(
          and(
            eq(schema.recruitmentJobsSchema.id, dto.jobId),
            eq(schema.recruitmentJobsSchema.status, "active"),
            isNull(schema.recruitmentJobsSchema.deletedAt)
          )
        )
        .limit(1);

      if (!job) {
        throw new NotFoundException(CANDIDATES_MESSAGES.ERROR.JOB_NOT_FOUND);
      }

      // 2. Block self-application
      if (job.requesterId === userId) {
        throw new ForbiddenException(
          CANDIDATES_MESSAGES.ERROR.SELF_APPLICATION
        );
      }

      // 3. Validate sharer code exists and matches the job
      const [share] = await tx
        .select()
        .from(schema.recruitmentJobShares)
        .where(
          and(
            eq(schema.recruitmentJobShares.sharerCode, dto.sharerCode),
            eq(schema.recruitmentJobShares.jobId, dto.jobId)
          )
        )
        .limit(1);

      if (!share) {
        throw new BadRequestException(
          CANDIDATES_MESSAGES.ERROR.INVALID_SHARER_CODE
        );
      }

      // 4. Check for duplicate application
      const [existing] = await tx
        .select({ id: schema.recruitmentJobCandidates.id })
        .from(schema.recruitmentJobCandidates)
        .where(
          and(
            eq(schema.recruitmentJobCandidates.jobId, dto.jobId),
            eq(schema.recruitmentJobCandidates.candidateUserId, userId),
            isNull(schema.recruitmentJobCandidates.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        throw new ConflictException(CANDIDATES_MESSAGES.ERROR.ALREADY_APPLIED);
      }

      // 5. Resolve LinkedIn URL
      const [user] = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      const submittedCanonical = toCanonicalLinkedInProfileUrl(
        dto.linkedinUrl?.trim()
      );
      const profileHadLinkedin = !!toCanonicalLinkedInProfileUrl(
        user?.linkedinUrl
      );
      const linkedinUrl =
        submittedCanonical ||
        toCanonicalLinkedInProfileUrl(user?.linkedinUrl) ||
        null;

      // 6. Input-path only (profile had no LI): save users + contact later.
      // Profile-settings updates must not touch contact tables.
      if (submittedCanonical && !profileHadLinkedin) {
        await tx
          .update(schema.users)
          .set({ linkedinUrl: submittedCanonical, updatedAt: now })
          .where(eq(schema.users.id, userId));
      }

      // 6a. Persist payout country on the user profile (required for apply).
      const normalizedCountry = dto.country.trim().toUpperCase();
      const payoutCurrency = getPayoutCurrencyForCountry(normalizedCountry);
      // Also repair a stale/missing payoutCurrency when the country is unchanged.
      if (
        user?.country !== normalizedCountry ||
        user?.payoutCurrency !== payoutCurrency
      ) {
        await tx
          .update(schema.users)
          .set({
            country: normalizedCountry,
            payoutCurrency,
            updatedAt: now,
          })
          .where(eq(schema.users.id, userId));
      }

      // 7. Create contact for the sharer (attribution still proceeds if this fails;
      // board uses leftJoin + user/anonymousLabel fallbacks for display).
      let contactId: number | null = null;
      if (share.sharerId) {
        try {
          contactId = await this.contactService.createContactForSharer(
            user,
            share.sharerId,
            tx,
            linkedinUrl
          );
          if (contactId != null && submittedCanonical && !profileHadLinkedin) {
            await upsertContactLinkedin(tx, contactId, submittedCanonical, now);
          }
        } catch (error) {
          this.logger.error(
            `CANDIDATES_MUTATION_SERVICE :: APPLY : ERROR : contactCreation sharerId=${share.sharerId} candidateUserId=${userId} jobId=${dto.jobId} : ${error}`
          );
        }
      }

      // 8. Look up default stage (processing)
      const [defaultStage] = await tx
        .select()
        .from(schema.recruitmentStagesSchema)
        .where(
          eq(
            schema.recruitmentStagesSchema.stageKey,
            CANDIDATE_EVALUATION_CONFIG.STAGES.PROCESSING
          )
        )
        .limit(1);

      // 9. Generate anonymous label
      const shortId = crypto.randomBytes(3).toString("hex").toUpperCase();
      const anonymousLabel = `Candidate #RC-${shortId}`;

      // 10. Insert candidate record
      let candidate: schema.RecruitmentJobCandidate;
      try {
        const [inserted] = await tx
          .insert(schema.recruitmentJobCandidates)
          .values({
            jobId: dto.jobId,
            candidateUserId: userId,
            shareId: share.id,
            sharerCode: dto.sharerCode,
            stageId: defaultStage?.id ?? null,
            linkedinUrl,
            resumeMediaId: null,
            contactId,
            anonymousLabel,
            stageUpdatedAt: now,
            // Initialize skill matching fields
            matchScore: null,
            matchedSkills: null,
            missingSkills: null,
            analysisAt: null,
            analysisStatus: CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.PENDING,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
          })
          .returning();
        candidate = inserted;

        // 10b. Attribute candidate to the sharer (direct-apply path is always
        // single-connector — no split eligibility, per product rules).
        // Must succeed when sharerId is present — otherwise recruiter "Referred by"
        // and connector pipeline referred query will miss this candidate.
        if (share.sharerId) {
          await this.candidateConnectorsService.addPrimary(
            tx,
            candidate.id,
            share.sharerId
          );
        }

        // 11. Resume media (required)
        const [media] = await this.mediaService.createMedia({
          data: [
            {
              recordId: candidate.id,
              module: MediaModules.CANDIDATE_RESUME,
              filePath: dto.resume.filePath,
              fileName: dto.resume.fileName,
              fileType: dto.resume.fileType as MediaType,
              mimeType: dto.resume.mimeType,
              size: dto.resume.size,
            },
          ],
          userId,
          queryRunner: tx,
        });

        let resumeMediaId: string | null = null;
        if (media) {
          resumeMediaId = media.id;
          await tx
            .update(schema.recruitmentJobCandidates)
            .set({ resumeMediaId: media.id })
            .where(eq(schema.recruitmentJobCandidates.id, candidate.id));
        }

        // 12. Insert initial stage history entry for timeline
        await tx.insert(schema.recruitmentCandidateStageHistory).values({
          candidateId: candidate.id,
          stageId: defaultStage?.id ?? null,
          note: "Application submitted",
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });

        // 12b. Insert processing stage history entry for timeline
        await tx.insert(schema.recruitmentCandidateStageHistory).values({
          candidateId: candidate.id,
          stageId: defaultStage?.id ?? null,
          note: "Candidate evaluation in progress",
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });

        // 12c. Persist assessment answers (snapshot + scored). No-op when the
        // job has no assessment; throws if a required question is unanswered.
        // Final Unqualified/In Review placement is decided by the async
        // evaluation once the AI score is available.
        await persistCandidateAssessmentResponses(tx, {
          candidateId: candidate.id,
          jobId: dto.jobId,
          responses: dto.assessmentResponses ?? [],
          userId,
        });

        // 12. Create workflow row for candidate lifecycle tracking
        await tx.insert(schema.recruitmentCandidateWorkflow).values({
          candidateId: candidate.id,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        });

        return {
          candidate,
          resumeMediaId,
          contactId,
          jobId: dto.jobId,
        };
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          "code" in error &&
          (error as { code: string }).code === "23505"
        ) {
          throw new ConflictException(
            CANDIDATES_MESSAGES.ERROR.ALREADY_APPLIED
          );
        }
        throw error;
      }
    });

    if (txResult.resumeMediaId) {
      void this.resumeExtractionQueueService
        .queueExtraction({
          mediaId: txResult.resumeMediaId,
          candidateId: txResult.candidate.id,
          contactId: txResult.contactId ?? undefined,
          jobId: txResult.jobId,
          userId,
        })
        .catch((err: unknown) => {
          this.logger.error(
            `CANDIDATES_MUTATION_SERVICE :: APPLY : RESUME_QUEUE_ERROR : ${err}`
          );
        });

      // Candidate evaluation is chained off the extraction job once the resume
      // is parsed, so it is not enqueued here — that way it reuses the
      // extraction instead of sending the same PDF to the AI a second time.
    }

    return {
      id: txResult.candidate.id,
      anonymousLabel: txResult.candidate.anonymousLabel,
      message: CANDIDATES_MESSAGES.SUCCESS.APPLIED,
    };
  }
}
