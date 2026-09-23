import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FAILURE_REASONS } from "./refunds.constants";

export class MarkUnfulfilledDto {
  @ApiProperty({
    description: "Reason for marking the introduction as unfulfilled",
    enum: Object.values(FAILURE_REASONS),
    example: "no_response",
  })
  @IsEnum(Object.values(FAILURE_REASONS), {
    message: `failureReason must be one of: ${Object.values(FAILURE_REASONS).join(", ")}`,
  })
  failureReason: string;

  @ApiPropertyOptional({
    description: "Additional notes about the failure",
    example: "Prospect did not respond after 3 follow-up attempts",
  })
  @IsOptional()
  @IsString()
  failureNotes?: string;
}

export interface RefundResult {
  success: boolean;
  refundedStages: RefundedStageInfo[];
  cancelledIntents: string[];
  totalRefundedAmount: number;
  error?: string;
}

export interface RefundedStageInfo {
  stageName: string;
  stripeRefundId: string;
  refundAmount: number;
  refundStatus: string;
}

export interface MarkUnfulfilledResult {
  success: boolean;
  message: string;
  refundDetails?: RefundResult;
}
