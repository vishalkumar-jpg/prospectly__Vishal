import { ApiProperty } from "@nestjs/swagger";

export class ExceptionErrorDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  error: string;

  @ApiProperty()
  message: string;
}
