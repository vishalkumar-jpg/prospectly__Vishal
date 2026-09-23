import { ZodSchema, ZodError } from "zod";
import { FieldValues, Resolver } from "react-hook-form";

export const safeResolver =
  <T extends FieldValues>(schema: ZodSchema<T>): Resolver<T> =>
  async (values) => {
    try {
      const data = schema.parse(values);
      return {
        values: data,
        errors: {},
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          values: {},
          errors: error.issues.reduce((allErrors, currentError) => {
            const path = currentError.path.join(".") || "root";
            const existingError = allErrors[path];

            // If we already have an error for this path, we might want to keep the first one
            // or concatenate messages. For simplicity/compatibility, we'll keep the first one
            // or just overwrite if needed. Here we follow the pattern of standard resolvers
            // often keeping the first.
            if (existingError) {
              return allErrors;
            }

            return {
              ...allErrors,
              [path]: {
                type: currentError.code,
                message: currentError.message,
              },
            };
          }, {} as FieldValues),
        };
      }
      return {
        values: {},
        errors: {},
      };
    }
  };
