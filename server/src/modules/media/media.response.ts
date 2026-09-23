import { Expose, Transform } from "class-transformer";
import { ApiPropertyWritable } from "modules/swagger/swagger.writable.decorator";
import { getImageUrl } from "utils/helper.utils";

export class MediaResponse {
  @Expose()
  @ApiPropertyWritable()
  id: string;

  @Expose()
  @ApiPropertyWritable()
  @Transform(({ value }) => getImageUrl(value))
  filePath: string;

  @Expose()
  @ApiPropertyWritable()
  fileName: string;

  @Expose()
  @ApiPropertyWritable()
  fileType: string;

  @Expose()
  @ApiPropertyWritable({ type: Number, nullable: true })
  size?: number;
}
