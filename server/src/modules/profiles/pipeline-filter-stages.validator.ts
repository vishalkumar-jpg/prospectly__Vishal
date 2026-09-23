import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

/**
 * Validates pipeline filter stages: trims, deduplicates, and ensures each
 * element is in the canonical allowed set.
 */
export function PipelineFilterStages(allowed: readonly string[]) {
  const allowedArr = [...allowed];
  return applyDecorators(
    Transform(({ value }) => {
      if (!Array.isArray(value)) return value;
      const trimmed = value
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter(
          (item) =>
            item !== "" &&
            item !== null &&
            item !== undefined &&
            typeof item === "string"
        );
      return [...new Set(trimmed)];
    }),
    IsOptional(),
    IsArray(),
    IsString({ each: true }),
    IsIn(allowedArr, { each: true })
  );
}
