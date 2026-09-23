import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import { CONNECTOR_PAYOUT_WAIT_MAX_DAYS } from "./recruitment-jobs.constants";

/**
 * Cross-field rule for a connector type's wait-days against its wait flag:
 * when the flag (named in `constraints[0]`) is true, the day count must be an
 * integer in [1, CONNECTOR_PAYOUT_WAIT_MAX_DAYS]; when the flag is not true, the
 * day count must be absent. Runs even when the value is undefined (so an enabled
 * wait with a missing duration is rejected rather than silently paid on hire).
 */
@ValidatorConstraint({ name: "connectorWaitDaysMatchesFlag", async: false })
export class ConnectorWaitDaysMatchesFlag implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const flag = (args.object as Record<string, unknown>)[
      args.constraints[0] as string
    ];
    if (flag === true) {
      return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= CONNECTOR_PAYOUT_WAIT_MAX_DAYS
      );
    }
    return value === undefined || value === null;
  }

  defaultMessage(args: ValidationArguments): string {
    const flag = (args.object as Record<string, unknown>)[
      args.constraints[0] as string
    ];
    return flag === true
      ? `A waiting period of 1-${CONNECTOR_PAYOUT_WAIT_MAX_DAYS} days is required when this connector type waits`
      : "A waiting period cannot be set when this connector type is paid on hire";
  }
}

/** Applies {@link ConnectorWaitDaysMatchesFlag} against the given wait-flag field. */
export function ConnectorWaitDaysMatchesFlagFor(
  flagField: string,
  options?: ValidationOptions
) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [flagField],
      options,
      validator: ConnectorWaitDaysMatchesFlag,
    });
}
