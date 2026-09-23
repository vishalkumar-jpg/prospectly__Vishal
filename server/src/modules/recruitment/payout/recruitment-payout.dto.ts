import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsIn,
  IsBoolean,
  IsArray,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import {
  INTERVIEW_OUTCOMES,
  RECRUITER_SELECTABLE_CANCELLATION_REASONS,
  RECRUITER_SELECTABLE_CONNECTOR_CANCELLATION_REASONS,
  RECRUITMENT_PAYOUT_TYPE,
} from "./recruitment-payout.constants";

const OUTCOME_VALUES = Object.values(INTERVIEW_OUTCOMES);

// Union of every recruiter-selectable cancellation reason (candidate + connector).
// The DTO accepts any of these; the release service enforces that the reason
// matches the chosen `scope` (candidate reasons for candidate, connector for
// connector).
const ALL_SELECTABLE_CANCELLATION_REASONS = [
  ...new Set<string>([
    ...RECRUITER_SELECTABLE_CANCELLATION_REASONS,
    ...RECRUITER_SELECTABLE_CONNECTOR_CANCELLATION_REASONS,
  ]),
];

const RELEASE_SCOPES = [
  RECRUITMENT_PAYOUT_TYPE.CONNECTOR,
  RECRUITMENT_PAYOUT_TYPE.CANDIDATE,
];

export class MarkInterviewOutcomeParamDto {
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;
}

export class MarkInterviewOutcomeDto {
  @IsNotEmpty()
  @IsIn(OUTCOME_VALUES)
  outcome: string;

  @ValidateIf(
    (o) =>
      o.outcome === INTERVIEW_OUTCOMES.NO_SHOW ||
      o.outcome === INTERVIEW_OUTCOMES.CANCELLED
  )
  @IsNotEmpty({
    message: "Comment is required for no-show or cancelled outcomes",
  })
  @IsString()
  @TrimString()
  @MaxLength(500)
  comment?: string;

  @ValidateIf((o) => o.outcome === INTERVIEW_OUTCOMES.COMPLETED)
  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(500)
  completedComment?: string;
}

export class ReleasePayoutClassificationDto {
  @IsNotEmpty()
  @IsUUID()
  connectorUserId: string;

  @IsNotEmpty()
  @IsIn(["internal", "external"])
  classificationType: "internal" | "external";

  @IsOptional()
  @IsBoolean()
  isActiveEmployee?: boolean;
}

// Step 1 of the two-step release: collect the post-hire fee top-up only. The
// amount is never supplied by the client — it is recomputed server-side from the
// stored price row and the payout's own snapshot.
export class FundPayoutTopUpDto {
  @IsNotEmpty()
  @IsIn(RELEASE_SCOPES)
  scope: "connector" | "candidate";
}

export class ReleasePayoutDto {
  // Which payout type this action targets — connector payouts or the candidate
  // success-fee bonus. Each is released/cancelled independently.
  @IsNotEmpty()
  @IsIn(RELEASE_SCOPES)
  scope: "connector" | "candidate";

  @IsNotEmpty()
  @IsBoolean()
  retained: boolean;

  // Required when retained=true and scope=connector; the recruiter re-confirms
  // each connector's type/active-employee at release time. Ignored for the
  // candidate scope and when retained=false.
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ReleasePayoutClassificationDto)
  classifications?: ReleasePayoutClassificationDto[];

  // Required when retained=false. Must be a recruiter-selectable reason; the
  // release service further enforces that it matches `scope`. `not_retained`
  // and `inactive_employee` are reserved for legacy/system paths.
  @ValidateIf((o) => o.retained === false)
  @IsNotEmpty({ message: "Cancellation reason is required" })
  @IsIn(ALL_SELECTABLE_CANCELLATION_REASONS)
  cancellationReason?: string;

  // Required free-form notes accompanying the cancellation reason.
  @ValidateIf((o) => o.retained === false)
  @IsString()
  @TrimString()
  @IsNotEmpty({ message: "Cancellation notes are required" })
  @MinLength(3)
  @MaxLength(500)
  cancellationNotes?: string;
}
