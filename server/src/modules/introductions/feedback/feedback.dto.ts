import {
  IsNumber,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TrimString } from "decorators/trim-string.decorator";
import { Type } from "class-transformer";

export class SubmitFeedbackDto {
  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  existingFeedbackId?: string;

  @ApiProperty()
  @TrimString()
  feedbackType: "meeting_feedback" | "peer_feedback";

  @ApiProperty()
  @IsNumber()
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @TrimString()
  feedbackText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  meetingCompleted?: boolean;
}

export class GetReviewsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class ReviewResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rating: number;

  @ApiPropertyOptional()
  comments?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  requester_name: string;
}

export class ReviewsListResponseDto {
  @ApiProperty({ type: [ReviewResponseDto] })
  reviews: ReviewResponseDto[];

  @ApiProperty()
  totalReviews: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  avgRating?: number;
}
