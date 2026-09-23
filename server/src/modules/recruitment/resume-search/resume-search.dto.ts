import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";
import { TrimString } from "decorators/trim-string.decorator";
import {
  RESUME_SEARCH_MAX_QUERY_LENGTH,
  RESUME_SEARCH_MIN_QUERY_LENGTH,
} from "./resume-search.constants";

export class ResumeSearchDto {
  @IsNotEmpty()
  @IsString()
  @TrimString()
  @MinLength(RESUME_SEARCH_MIN_QUERY_LENGTH)
  @MaxLength(RESUME_SEARCH_MAX_QUERY_LENGTH)
  query: string;
}
