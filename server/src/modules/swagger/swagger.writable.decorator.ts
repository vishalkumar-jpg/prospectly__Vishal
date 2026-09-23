import { ApiProperty, ApiPropertyOptions } from "@nestjs/swagger";

/**
 * Custom decorator that extends ApiProperty with readOnly set to false by default.
 * @param options Additional ApiProperty options to override the defaults.
 */
export const ApiPropertyWritable = (
  options?: ApiPropertyOptions
): PropertyDecorator => {
  return ApiProperty({
    ...options,
    readOnly: false, // Ensure readOnly is always false unless explicitly overridden
  });
};
