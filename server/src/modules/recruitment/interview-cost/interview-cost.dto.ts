import { IsNumber, Max, Min, IsNotEmpty, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { STRIPE_MAX_BOUNTY_DOLLARS } from "./interview-cost.constants";

export class CalculateFlatReferralFeeDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(STRIPE_MAX_BOUNTY_DOLLARS)
  flatFee: number;
}

export class ShortlistBreakdownParamDto {
  @IsNotEmpty()
  @IsUUID()
  candidateId: string;
}
