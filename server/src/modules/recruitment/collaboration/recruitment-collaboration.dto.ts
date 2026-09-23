import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class JobIdParamDto {
  @ApiProperty({ description: "Job post id" })
  @IsUUID()
  jobId!: string;
}

export class RemoveCollaboratorParamDto {
  @ApiProperty({ description: "Job post id" })
  @IsUUID()
  jobId!: string;

  @ApiProperty({ description: "Collaborator user id to remove" })
  @IsUUID()
  collaboratorUserId!: string;
}

export class BulkAddCollaboratorsDto {
  @ApiProperty({
    description: "User ids to add as collaborators (max 100 per request).",
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID("all", { each: true })
  userIds!: string[];

  @ApiPropertyOptional({
    description:
      "Collaboration role id. Defaults to the seeded candidate_manager role.",
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description: "Send each added collaborator an email notification.",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class ListEligibleMembersQueryDto {
  @ApiPropertyOptional({ description: "Search members by name or email" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
