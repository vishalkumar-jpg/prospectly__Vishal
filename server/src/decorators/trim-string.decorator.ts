import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsArray, IsString } from "class-validator";

export function TrimString() {
  return applyDecorators(
    Transform(({ value }) => {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }
      return typeof value === "string" ? value.trim() : value;
    }),
    IsString()
  );
}

export function TrimArrayString() {
  return applyDecorators(
    Transform(({ value }) =>
      Array.isArray(value)
        ? value
            .map((item) => (typeof item === "string" ? item.trim() : item))
            .filter(
              (item) => item !== "" && item !== null && item !== undefined
            )
        : value
    ),
    IsString({ each: true }),
    IsArray()
  );
}
