import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import { toUTC } from "utils/dayjs";
import {
  JOB_POOL_MATCH_STATUS,
  JOB_POOL_MATCH_SOURCE,
} from "modules/recruitment/job-pool-matches/job-pool-matches.constants";
import { MediaService } from "modules/media/media.service";
import { MediaModules, MediaType } from "modules/media/media.constants";
import { ResumeExtractionQueueService } from "modules/recruitment/resume-extraction/resume-extraction-queue.service";
import { CANDIDATE_EVALUATION_CONFIG } from "modules/recruitment/candidate-evaluation/candidate-evaluation.constants";
import {
  determinePipelineStageKey,
  describeNotQualifiedReason,
} from "modules/recruitment/candidate-evaluation/candidate-pipeline-stage.decider";
import { parseGapAnalysisStored } from "modules/recruitment/candidate-evaluation/gap-analysis.mapper";
import {
  scoreCandidateResponses,
  insertCandidateResponseRows,
} from "modules/recruitment/assessment-bank/candidate-response/candidate-response.persistence";
import { CandidateConnectorsService } from "modules/recruitment/candidate-connectors/candidate-connectors.service";
import { RecruitmentPayoutSplitService } from "modules/recruitment/payout/services/recruitment-payout-split.service";
import { RecruitmentLifecycleNotificationDispatchService } from "modules/recruitment/notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { upsertContactLinkedin } from "utils/linkedin-contact.persist";
import { toCanonicalLinkedInProfileUrl } from "utils/linkedin-profile.utils";
import { getPayoutCurrencyForCountry } from "config/payment.config";
import crypto from "node:crypto";
import { ConsentTokenService } from "./consent-token.service";
import { CONSENT_MESSAGES } from "../consent.constants";
import { isSupersededConsentToken } from "../consent-token.utils";
import { ConsentApplyDto } from "../consent.dto";
import {
  isJobConsentAcceptedForEmail,
  supersedeOtherMatchesForJobEmail,
} from "../consent-job-claim.utils";

@Injectable()
export class ConsentApplyService {
  private readonly logger = new Logger(ConsentApplyService.name);

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly consentTokenService: ConsentTokenService,
    private readonly mediaService: MediaService,
    private readonly resumeExtractionQueueService: ResumeExtractionQueueService,
    private readonly candidateConnectorsService: CandidateConnectorsService,
    private readonly payoutSplitService: RecruitmentPayoutSplitService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async consentApply(userId: string, dto: ConsentApplyDto) {
    // 1. Verify token
    let payload;
    try {
      payload = await this.consentTokenService.verifyToken(dto.token);
    } catch {
      throw new BadRequestException(CONSENT_MESSAGES.ERROR.TOKEN_INVALID);
    }

    // 2. Verify email match
    const [loggedInUser] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (loggedInUser?.email) {
      const loggedInEmailHash = crypto
        .createHash("sha256")
        .update(loggedInUser.email.toLowerCase().trim())
        .digest("hex");

      if (loggedInEmailHash !== payload.emailHash) {
        throw new ForbiddenException(CONSENT_MESSAGES.ERROR.EMAIL_MISMATCH);
      }
    }

    const now = toUTC();

    const txResult = await this.db.transaction(async (tx) => {
      // 3. Validate match status
      const [match] = await tx
        .select()
        .from(schema.recruitmentJobPoolMatches)
        .where(
          and(
            eq(schema.recruitmentJobPoolMatches.id, payload.matchId),
            isNull(schema.recruitmentJobPoolMatches.deletedAt)
          )
        )
        .limit(1);

      if (!match) {
        throw new NotFoundException(CONSENT_MESSAGES.ERROR.MATCH_NOT_FOUND);
      }

      if (isSupersededConsentToken(match, dto.token)) {
        throw new BadRequestException(CONSENT_MESSAGES.ERROR.TOKEN_SUPERSEDED);
      }

      if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_DECLINED) {
        throw new BadRequestException(
          CONSENT_MESSAGES.ERROR.CONSENT_DECLINED_PERMANENT
        );
      }

      if (match.status === JOB_POOL_MATCH_STATUS.CONSENT_SUPERSEDED) {
        throw new BadRequestException(
          CONSENT_MESSAGES.ERROR.CONSENT_SUPERSEDED
        );
      }

      if (match.status !== JOB_POOL_MATCH_STATUS.CONSENT_PENDING) {
        throw new BadRequestException(
          CONSENT_MESSAGES.ERROR.CONSENT_ALREADY_RESPONDED
        );
      }

      // Race guard: another connector may have just been accepted for this job+email.
      if (
        await isJobConsentAcceptedForEmail(tx, {
          jobId: match.jobId,
          emailHash: payload.emailHash,
          contactId: match.contactId,
        })
      ) {
        throw new ConflictException(
          CONSENT_MESSAGES.ERROR.CLAIMED_BY_OTHER_CONNECTOR
        );
      }

      // 4. Validate job is active
      const [job] = await tx
        .select()
        .from(schema.recruitmentJobsSchema)
        .where(
          and(
            eq(schema.recruitmentJobsSchema.id, payload.jobId),
            eq(schema.recruitmentJobsSchema.status, "active"),
            isNull(schema.recruitmentJobsSchema.deletedAt)
          )
        )
        .limit(1);

      if (!job) {
        throw new BadRequestException(CONSENT_MESSAGES.ERROR.JOB_NOT_ACTIVE);
      }

      // 5. Block self-apply
      if (job.requesterId === userId) {
        throw new ForbiddenException(CONSENT_MESSAGES.ERROR.SELF_APPLICATION);
      }

      // 6. Check duplicate application
      const [existing] = await tx
        .select({ id: schema.recruitmentJobCandidates.id })
        .from(schema.recruitmentJobCandidates)
        .where(
          and(
            eq(schema.recruitmentJobCandidates.jobId, payload.jobId),
            eq(schema.recruitmentJobCandidates.candidateUserId, userId),
            isNull(schema.recruitmentJobCandidates.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        throw new ConflictException(CONSENT_MESSAGES.ERROR.ALREADY_APPLIED);
      }

      // 7. Detect connector-uploaded path: the connector already provided a
      // resume + AI evaluation. We reuse that and skip resume/LinkedIn upload.
      const isConnectorUploaded =
        match.source === JOB_POOL_MATCH_SOURCE.CONNECTOR_UPLOADED &&
        !!match.resumeMediaId;

      // AI-matched / system-referred contacts have no resume on file — require one.
      if (!isConnectorUploaded && !dto.resume && !dto.resumeMediaId) {
        throw new BadRequestException(CONSENT_MESSAGES.ERROR.RESUME_REQUIRED);
      }

      let connectorContactLinkedin: string | null = null;
      if (isConnectorUploaded) {
        const [contactRow] = await tx
          .select({ linkedin: schema.contacts.linkedin })
          .from(schema.contacts)
          .where(eq(schema.contacts.id, match.contactId))
          .limit(1);
        connectorContactLinkedin = contactRow?.linkedin ?? null;
      }

      // 7a. Resolve LinkedIn URL. For connector-uploaded, fall back to the
      // contact record's LinkedIn (extracted from the resume by the upload
      // processor) before requiring the candidate to provide one.
      const submittedCanonical = toCanonicalLinkedInProfileUrl(
        dto.linkedinUrl?.trim()
      );
      const profileHadLinkedin = !!toCanonicalLinkedInProfileUrl(
        loggedInUser?.linkedinUrl
      );
      const linkedinUrl =
        submittedCanonical ||
        toCanonicalLinkedInProfileUrl(loggedInUser?.linkedinUrl) ||
        (isConnectorUploaded
          ? toCanonicalLinkedInProfileUrl(connectorContactLinkedin)
          : null) ||
        null;

      // 8. Input-path only (profile had no LI): save to users + contact tables.
      // Profile-settings updates and show-only apply must not touch contacts.
      if (submittedCanonical && !profileHadLinkedin) {
        await tx
          .update(schema.users)
          .set({ linkedinUrl: submittedCanonical, updatedAt: now })
          .where(eq(schema.users.id, userId));

        if (match.contactId != null) {
          await upsertContactLinkedin(
            tx,
            match.contactId,
            submittedCanonical,
            now
          );
        }
      }

      // 8a. Persist payout country on the user profile (required for apply).
      const normalizedCountry = dto.country.trim().toUpperCase();
      const payoutCurrency = getPayoutCurrencyForCountry(normalizedCountry);
      // Also repair a stale/missing payoutCurrency when the country is unchanged.
      if (
        loggedInUser?.country !== normalizedCountry ||
        loggedInUser?.payoutCurrency !== payoutCurrency
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

      // 8b. Score the candidate's assessment answers up-front (validates that
      // every required question is answered before we create any rows). Returns
      // empty + allCorrect=true when the job has no assessment.
      const { rows: assessmentRows, allCorrect: assessmentAllCorrect } =
        await scoreCandidateResponses(tx, {
          jobId: payload.jobId,
          responses: dto.assessmentResponses ?? [],
        });

      // 9. Resolve target stage + analysis fields.
      // - connector-uploaded with a known match score: the score is already
      //   known, so place immediately (In Review vs Unqualified) using the
      //   shared decider (score threshold + assessment correctness) and skip
      //   both the resume-extraction and candidate-evaluation queues.
      // - otherwise: fall back to processing + pending analysis; the async
      //   evaluation applies the same decision once the score is available.
      const matchScoreNum =
        match.matchScore != null ? Number(match.matchScore) : null;
      const hasUsableScore =
        isConnectorUploaded &&
        matchScoreNum != null &&
        !Number.isNaN(matchScoreNum);

      const stageInput = {
        matchScore: matchScoreNum as number,
        assessmentPassed: assessmentAllCorrect,
      };
      const targetStageKey = hasUsableScore
        ? determinePipelineStageKey(stageInput)
        : CANDIDATE_EVALUATION_CONFIG.STAGES.PROCESSING;
      const placedInReview =
        targetStageKey === CANDIDATE_EVALUATION_CONFIG.STAGES.IN_REVIEW;
      // Reason is known only when we place synchronously; the async path fills it
      // in later via the evaluation processor.
      const notQualifiedReason = hasUsableScore
        ? describeNotQualifiedReason(stageInput)
        : null;
      // The async evaluation path sets analysisNote from the AI verdict. This
      // path skips that processor, so lift the verdict out of the inherited
      // gap analysis to keep both paths rendering the same summary line.
      const inheritedAnalysisNote = isConnectorUploaded
        ? (parseGapAnalysisStored(match.gapAnalysis)?.verdict ?? null)
        : null;

      const [defaultStage] = await tx
        .select()
        .from(schema.recruitmentStagesSchema)
        .where(eq(schema.recruitmentStagesSchema.stageKey, targetStageKey))
        .limit(1);

      const shortId = crypto.randomBytes(3).toString("hex").toUpperCase();
      const anonymousLabel = `Candidate #RC-${shortId}`;

      // 10. Insert candidate record
      const [candidate] = await tx
        .insert(schema.recruitmentJobCandidates)
        .values({
          jobId: payload.jobId,
          candidateUserId: userId,
          shareId: null,
          sharerCode: null,
          stageId: defaultStage?.id ?? null,
          linkedinUrl,
          // Connector-uploaded path reuses the pool match's resume media;
          // dto.resume/resumeMediaId are ignored in that branch.
          resumeMediaId: isConnectorUploaded
            ? (match.resumeMediaId ?? null)
            : (dto.resumeMediaId ?? null),
          contactId: match.contactId,
          anonymousLabel,
          stageUpdatedAt: now,
          // Skill matching fields: inherit from pool match when available.
          matchScore: hasUsableScore ? String(matchScoreNum) : null,
          matchedSkills: isConnectorUploaded
            ? ((match.matchedSignals as unknown) ?? null)
            : null,
          missingSkills: isConnectorUploaded
            ? ((match.concerns as unknown) ?? null)
            : null,
          gapAnalysis: isConnectorUploaded ? (match.gapAnalysis ?? null) : null,
          analysisNote: inheritedAnalysisNote,
          analysisAt: hasUsableScore ? now : null,
          analysisStatus: hasUsableScore
            ? CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.COMPLETED
            : CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.PENDING,
          notQualifiedReason,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      // 10a. Backfill contact_resumes.candidateId for the connector-uploaded
      // path. The upload processor saved the parsed resume with candidateId=null
      // because no candidate row existed yet; this is the first moment we have
      // one. Without this, candidates-list and candidates-detail JOINs on
      // contact_resumes.candidateId never find the row, and the recruiter sees
      // empty job title / years of experience / resume metadata on the card
      // and detail modal.
      if (isConnectorUploaded && match.resumeMediaId) {
        await tx
          .update(schema.contactResumes)
          .set({ candidateId: candidate.id, updatedAt: now })
          .where(
            and(
              eq(schema.contactResumes.mediaId, match.resumeMediaId),
              isNull(schema.contactResumes.candidateId),
              isNull(schema.contactResumes.deletedAt)
            )
          );
      }

      // 10b. Persist the scored assessment responses (snapshot-on-response).
      await insertCandidateResponseRows(tx, {
        candidateId: candidate.id,
        rows: assessmentRows,
        userId,
      });

      // 11. Attribute candidate to connector(s) via the mapping table.
      // Consent apply is the split decision point — resolveConnectorsForNewCandidate
      // checks whether the match's connector is a "claimer" with an origin row
      // pointing at this exact job, and if so returns a 50/50 split with the
      // original sharer as the co-recipient. Otherwise it collapses to primary.
      if (match.connectorUserId) {
        const resolution =
          await this.payoutSplitService.resolveConnectorsForNewCandidate(tx, {
            claimerId: match.connectorUserId,
            jobId: payload.jobId,
          });

        if (resolution.mode === "split") {
          const claimer = resolution.recipients.find(
            (r) => r.role === "claimer"
          );
          const sharer = resolution.recipients.find((r) => r.role === "sharer");
          if (claimer && sharer) {
            await this.candidateConnectorsService.addSplit(
              tx,
              candidate.id,
              claimer.userId,
              sharer.userId
            );
          }
        } else {
          await this.candidateConnectorsService.addPrimary(
            tx,
            candidate.id,
            match.connectorUserId
          );
        }
      }

      // 12. Insert stage history
      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId: candidate.id,
        stageId: defaultStage?.id ?? null,
        note: isConnectorUploaded
          ? "Application submitted via consent (connector-uploaded resume)"
          : "Application submitted via consent",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      // 12b. Timeline note: for the ai_matched path, evaluation is still
      // pending; for the connector-uploaded path, the score was inherited.
      await tx.insert(schema.recruitmentCandidateStageHistory).values({
        candidateId: candidate.id,
        stageId: defaultStage?.id ?? null,
        note: hasUsableScore
          ? "Auto-evaluated from connector upload"
          : "Candidate evaluation in progress",
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      let resumeMediaId: string | null = isConnectorUploaded
        ? (match.resumeMediaId ?? null)
        : (dto.resumeMediaId ?? null);
      if (!isConnectorUploaded && dto.resume) {
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

        if (media) {
          resumeMediaId = media.id;
          await tx
            .update(schema.recruitmentJobCandidates)
            .set({ resumeMediaId: media.id })
            .where(eq(schema.recruitmentJobCandidates.id, candidate.id));
        }
      }

      // 13. Create workflow row for candidate lifecycle tracking
      await tx.insert(schema.recruitmentCandidateWorkflow).values({
        candidateId: candidate.id,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        updatedBy: userId,
      });

      // 14. Update match status — this connector wins for this job.
      await tx
        .update(schema.recruitmentJobPoolMatches)
        .set({
          status: JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED,
          consentRespondedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.recruitmentJobPoolMatches.id, payload.matchId));

      // Rule 3: supersede every other connector match for this job + email
      // (covers duplicate contacts that share the same candidate email).
      await supersedeOtherMatchesForJobEmail(tx, {
        jobId: match.jobId,
        emailHash: payload.emailHash,
        excludeMatchId: payload.matchId,
        contactId: match.contactId,
      });

      // Use persisted candidate resumeMediaId as final fallback
      const finalResumeMediaId = resumeMediaId ?? candidate.resumeMediaId;

      return {
        candidate,
        resumeMediaId: finalResumeMediaId,
        contactId: match.contactId,
        jobId: payload.jobId,
        matchId: payload.matchId,
        skipExtractionAndEvaluation: isConnectorUploaded && hasUsableScore,
        placedInReview,
      };
    });

    // Queue resume extraction (same as apply job flow). The candidate
    // evaluation is chained off that job once the resume is parsed, so it is
    // not enqueued here — that way it reuses the extraction instead of sending
    // the same PDF to the AI a second time.
    // Connector-uploaded consent-apply skips extraction entirely: the
    // connector-upload processor already parsed the resume and ran the Gemini
    // evaluation, and we copied the results onto the candidate row above.
    if (txResult.resumeMediaId && !txResult.skipExtractionAndEvaluation) {
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
            `CONSENT_APPLY_SERVICE :: CONSENT_APPLY : RESUME_QUEUE_ERROR : ${err}`
          );
        });
    }

    // Notify the recruiter only when the candidate actually landed in In Review
    // (a synchronously-scored connector upload that passed the score + assessment
    // gate). Unqualified placements are visible on the board without a ping.
    if (txResult.placedInReview) {
      void this.lifecycleDispatch
        .dispatchRecruiterNewCandidate(txResult.candidate.id)
        .catch((err: unknown) => {
          this.logger.error(
            `RECRUITMENT_LIFECYCLE_DISPATCH :: consent_apply :: ${err}`
          );
        });
    }

    return {
      id: txResult.candidate.id,
      anonymousLabel: txResult.candidate.anonymousLabel,
      message: CONSENT_MESSAGES.SUCCESS.CONSENT_APPLIED,
    };
  }
}
