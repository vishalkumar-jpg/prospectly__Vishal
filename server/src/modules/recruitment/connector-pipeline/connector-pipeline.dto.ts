import { IsOptional, IsString, MaxLength } from "class-validator";

export class GetConnectorPipelineQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
