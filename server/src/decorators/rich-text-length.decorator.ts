import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from "class-validator";

/** Visible-text length of an HTML/plain string (tags + entities stripped). */
function visibleTextLength(value: unknown): number {
  if (typeof value !== "string") return 0;
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim().length;
}

/**
 * Validates the VISIBLE text length of a rich-text (HTML) field, so the limits
 * stay meaningful when markup inflates the raw string length. Mirrors the
 * client `richTextLength` check.
 */
export function IsRichTextLength(
  min: number,
  max: number,
  opts?: { allowEmpty?: boolean },
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isRichTextLength",
      target: object.constructor,
      propertyName,
      constraints: [min, max, opts?.allowEmpty ?? false],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [minLen, maxLen, allowEmpty] = args.constraints as [
            number,
            number,
            boolean,
          ];
          // Only strings are valid rich-text payloads. Reject other types
          // outright so `allowEmpty` can't let non-strings through.
          if (typeof value !== "string") return false;
          const len = visibleTextLength(value);
          if (allowEmpty && len === 0) return true;
          return len >= minLen && len <= maxLen;
        },
        defaultMessage(args: ValidationArguments) {
          const [minLen, maxLen] = args.constraints as [number, number];
          return `${args.property} must contain between ${minLen} and ${maxLen} characters`;
        },
      },
    });
  };
}
