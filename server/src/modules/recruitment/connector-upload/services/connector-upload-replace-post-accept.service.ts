import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE_TOKEN } from "database/drizzle.provider";
import * as schema from "database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { toUTC } from "utils/dayjs";
import { ConnectorUploadMatchResultsService } from "./connector-upload-match-results.service";
import {
  extractLegacySkillsFromDimensions,
  toGapAnalysisStored,
} from "../../candidate-evaluation/gap-analysis.mapper";
import {
  determinePipelineStageKey,
  describeNotQualifiedReason,
} from "../../candidate-evaluation/candidate-pipeline-stage.decider";
import { CandidateEvaluationQueryRepository } from "../../candidate-evaluation/services/candidate-evaluation-query.repository";
import { CandidateEvaluationMutationRepository } from "../../candidate-evaluation/services/candidate-evaluation-mutation.repository";
import { CandidateEvaluationService } from "../../candidate-evaluation/services/candidate-evaluation.service";
import { RecruitmentLifecycleNotificationDispatchService } from "../../notifications/services/recruitment-lifecycle-notification-dispatch.service";
import { REPLACE_LOCKED_RECRUITER_STAGES } from "../connector-upload-replace.constants";
import { JOB_POOL_MATCH_STATUS } from "../../job-pool-matches/job-pool-matches.constants";
import { CANDIDATE_EVALUATION_CONFIG } from "../../candidate-evaluation/candidate-evaluation.constants";

@Injectable()
export class ConnectorUploadReplacePostAcceptService {
  private readonly logger = new Logger(
    ConnectorUploadReplacePostAcceptService.name
  );

  constructor(
    @Inject(DRIZZLE_TOKEN)
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly evalQuery: CandidateEvaluationQueryRepository,
    private readonly evalMutation: CandidateEvaluationMutationRepository,
    private readonly matchResults: ConnectorUploadMatchResultsService,
    private readonly lifecycleDispatch: RecruitmentLifecycleNotificationDispatchService
  ) {}

  async apply(input: {
    matchId: string;
    candidateId: string;
    connectorUserId: string;
    evalResult: Awaited<
      ReturnType<CandidateEvaluationService["analyzeSkillMatch"]>
    >;
  }): Promise<void> {
    const { matchedSkills, missingSkills } = extractLegacySkillsFromDimensions(
      input.evalResult.dimensions
    );
    const gapAnalysis = toGapAnalysisStored(input.evalResult);
    const now = toUTC();
    const { STAGES } = CANDIDATE_EVALUATION_CONFIG;

    const stageTransition = await this.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select({
          stageKey: schema.recruitmentStagesSchema.stageKey,
        })
        .from(schema.recruitmentJobCandidates)
        .leftJoin(
          schema.recruitmentStagesSchema,
          eq(
            schema.recruitmentJobCandidates.stageId,
            schema.recruitmentStagesSchema.id
          )
        )
        .where(
          and(
            eq(schema.recruitmentJobCandidates.id, input.candidateId),
            isNull(schema.recruitmentJobCandidates.deletedAt)
          )
        )
        .for("update", { of: schema.recruitmentJobCandidates });

      if (!candidate?.stageKey) {
        throw new Error(`Candidate ${input.candidateId} not found`);
      }

      const priorStageKey = candidate.stageKey;
      const isLocked = REPLACE_LOCKED_RECRUITER_STAGES.includes(
        priorStageKey as (typeof REPLACE_LOCKED_RECRUITER_STAGES)[number]
      );

      if (isLocked) {
        await tx
          .update(schema.recruitmentJobCandidates)
          .set({
            matchScore: String(input.evalResult.matchPercentage),
            matchedSkills: matchedSkills.length > 0 ? matchedSkills : null,
            missingSkills: missingSkills.length > 0 ? missingSkills : null,
            gapAnalysis,
            analysisAt: now,
            analysisStatus:
              CANDIDATE_EVALUATION_CONFIG.ANALYSIS_STATUS.COMPLETED,
            analysisNote: input.evalResult.verdict,
            updatedAt: now,
            updatedBy: input.connectorUserId,
          })
          .where(eq(schema.recruitmentJobCandidates.id, input.candidateId));

        await this.matchResults.updateMatchWithResults(
          input.matchId,
          input.evalResult,
          {
            forceStatus: JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED,
            executor: tx,
          }
        );
        return { priorStageKey, newStageKey: priorStageKey };
      }

      const assessment = await this.evalQuery.getAssessmentSummary(
        input.candidateId,
        tx
      );
      const stageInput = {
        matchScore: input.evalResult.matchPercentage,
        assessmentPassed: assessment.hasResponses
          ? assessment.allCorrect
          : null,
      };
      const newStageKey = determinePipelineStageKey(stageInput);
      const newStage = await this.evalQuery.getStageByKey(newStageKey, tx);
      if (!newStage) {
        throw new Error(`Stage '${newStageKey}' not found`);
      }

      await this.evalMutation.persistAnalysisResult(
        input.candidateId,
        input.evalResult,
        newStage.id,
        input.connectorUserId,
        describeNotQualifiedReason(stageInput),
        tx
      );
      await this.matchResults.updateMatchWithResults(
        input.matchId,
        input.evalResult,
        {
          forceStatus: JOB_POOL_MATCH_STATUS.CONSENT_ACCEPTED,
          executor: tx,
        }
      );
      return { priorStageKey, newStageKey };
    });

    if (
      stageTransition.priorStageKey === STAGES.NOT_QUALIFIED &&
      stageTransition.newStageKey === STAGES.IN_REVIEW
    ) {
      void this.lifecycleDispatch
        .dispatchRecruiterNewCandidate(input.candidateId)
        .catch((err: unknown) => {
          this.logger.error(
            `CONNECTOR_UPLOAD_REPLACE_POST_ACCEPT :: DISPATCH : ERROR : ${err}`
          );
        });
    }
  }
}
