import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CalculateBountyDto {
  @ApiProperty({ description: "Contact ID" })
  @IsString()
  @IsNotEmpty()
  id: string;
}
