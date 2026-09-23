import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { REINSTATE_STAGE_KEYS } from "./candidate-workflow-reinstate.constants";

export class RejectCandidateDto {
  @IsNotEmpty()
  @IsString()
  @TrimString()
  @MaxLength(100)
  category: string;

  @IsNotEmpty({ message: "Additional notes are required" })
  @IsString()
  @TrimString()
  @MinLength(50, { message: "Additional notes must be at least 50 characters" })
  @MaxLength(500)
  note: string;
}

export class RejectCandidateParamDto {
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;
}

const HH_MM_30_MIN = /^([01]\d|2[0-3]):(00|30)$/;

export class WorkingHoursAvailabilityDto {
  @IsNotEmpty()
  @IsString()
  @Matches(HH_MM_30_MIN, {
    message: "startTime must be in HH:mm format on a 30-minute boundary",
  })
  startTime: string;

  @IsNotEmpty()
  @IsString()
  @Matches(HH_MM_30_MIN, {
    message: "endTime must be in HH:mm format on a 30-minute boundary",
  })
  endTime: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  timezone: string;
}

export class SendInterviewInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  interviewNotes?: string;

  // Recruiter's working hours, saved to user_configurations as the reusable
  // default and used to generate the candidate's bookable slots.
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursAvailabilityDto)
  availability?: WorkingHoursAvailabilityDto;
}

export class ConnectorClassificationDto {
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

export class HireCandidateDto {
  @IsNotEmpty()
  @IsISO8601()
  hireDate: string;

  // Classification is required for every connector on every job (the hire
  // service enforces coverage). It drives the connector waiting-period gate
  // (internal vs external) and the inactive-employee skip rule at Release time.
  // The array is bounded here; the per-connector coverage check lives in the
  // service so it can reference the actual connector list.
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConnectorClassificationDto)
  classifications: ConnectorClassificationDto[];
}

export class UpdateClassificationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConnectorClassificationDto)
  classifications: ConnectorClassificationDto[];
}

/**
 * Move a REJECTED candidate back to an earlier stage.
 *
 * `targetStageKey` is checked twice: shape-validated here against the
 * reinstate-eligible stage list, then re-validated in
 * CandidateWorkflowReinstateService against the candidate's OWN stage history.
 * Passing this DTO does not mean the stage is allowed for that candidate.
 */
export class ReinstateCandidateDto {
  @IsNotEmpty()
  @IsString()
  @TrimString()
  @IsIn(REINSTATE_STAGE_KEYS as string[], {
    message: "Select a valid stage to move the candidate back to",
  })
  targetStageKey: string;
}
