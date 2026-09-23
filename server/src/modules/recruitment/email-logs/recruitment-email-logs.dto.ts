import { IsIn, IsOptional, IsUUID } from "class-validator";

export class CandidateEmailLogsParamDto {
  @IsUUID()
  candidateId!: string;
}

export class PoolMatchEmailLogsParamDto {
  @IsUUID()
  matchId!: string;
}

export class EmailLogResendParamDto {
  @IsUUID()
  logId!: string;
}

export class EmailLogsAudienceQueryDto {
  @IsOptional()
  @IsIn(["connector", "recruiter"])
  audience?: "connector" | "recruiter";
}
