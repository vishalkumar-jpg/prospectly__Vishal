import { Transform } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";
import {
  DASHBOARD_PERIODS,
  DEFAULT_DASHBOARD_PERIOD,
  type DashboardPeriod,
} from "./recruiter-dashboard.constants";
import { parseCountriesQueryParam } from "../recruitment-country-filter.utils";

export class RecruiterDashboardCountriesQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseCountriesQueryParam(value))
  countries?: string[];
}

export class RecruiterDashboardPeriodQueryDto extends RecruiterDashboardCountriesQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    const normalized = String(value ?? DEFAULT_DASHBOARD_PERIOD);
    return DASHBOARD_PERIODS.includes(normalized as DashboardPeriod)
      ? (normalized as DashboardPeriod)
      : DEFAULT_DASHBOARD_PERIOD;
  })
  @IsIn([...DASHBOARD_PERIODS])
  period?: DashboardPeriod = DEFAULT_DASHBOARD_PERIOD;
}
