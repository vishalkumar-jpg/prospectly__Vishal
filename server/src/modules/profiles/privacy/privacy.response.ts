import { ApiPropertyWritable } from "modules/swagger/swagger.writable.decorator";
import { Expose, Type } from "class-transformer";
import { ReasonEnum } from "./privacy.constants";

export class PrivacyResponse {
  @Expose()
  @ApiPropertyWritable()
  id: string;

  @Expose()
  @ApiPropertyWritable()
  domain: string;

  @Expose()
  @ApiPropertyWritable({ enum: ReasonEnum })
  reason: ReasonEnum;

  @Expose()
  @ApiPropertyWritable()
  hideProfile: boolean;

  @Expose()
  @ApiPropertyWritable()
  hideBounties: boolean;

  // @Expose()
  // @ApiPropertyWritable()
  // excludeFromSearch: boolean;

  @Expose()
  @ApiPropertyWritable()
  createdAt: Date;
}

export class PrivacyListResponse {
  @Expose()
  @ApiPropertyWritable({ type: [PrivacyResponse] })
  @Type(() => PrivacyResponse)
  data: PrivacyResponse[];

  @Expose()
  @ApiPropertyWritable()
  total: number;

  @Expose()
  @ApiPropertyWritable()
  page: number;

  @Expose()
  @ApiPropertyWritable()
  limit: number;

  @Expose()
  @ApiPropertyWritable()
  totalPages: number;
}
