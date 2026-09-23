import {
  IsOptional,
  IsNumberString,
  IsArray,
  IsIn,
  ArrayUnique,
} from "class-validator";
import { Transform } from "class-transformer";
import { TrimString } from "decorators/trim-string.decorator";
import { SUPPORTED_PAYOUT_COUNTRIES } from "config/payment.config";
import { parseCountriesQueryParam } from "../recruitment-country-filter.utils";

const toCountryCodeArray = ({ value }: { value: unknown }): unknown => {
  if (value == null || value === "") return undefined;
  if (Array.isArray(value)) return parseCountriesQueryParam(value);
  if (typeof value === "string") return parseCountriesQueryParam(value);
  return value;
};

export class GetMarketplaceJobsQueryDto {
  @IsOptional()
  @TrimString()
  search?: string;

  @IsOptional()
  @Transform(toCountryCodeArray)
  @IsArray()
  @ArrayUnique()
  @IsIn([...SUPPORTED_PAYOUT_COUNTRIES], { each: true })
  countries?: string[];

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
