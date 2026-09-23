import { Logger } from "@nestjs/common";
import { dayjs } from "utils/dayjs";
import { CalendarTokenService, TokenData } from "./calendar-token.service";

export interface AvailableSlotsResult {
  slots: Array<{ start: string; end: string }>;
  timezone: string | null;
}

export abstract class BaseCalendarService {
  protected readonly logger: Logger;

  constructor(
    protected readonly tokenService: CalendarTokenService,
    serviceName: string
  ) {
    this.logger = new Logger(serviceName);
  }

  abstract getAuthUrl(userId: string): string;
  abstract handleCallback(
    code: string,
    userId: string
  ): Promise<{ tokens: AnyType; email: string | null }>;
  abstract createEvent(userId: string, event: AnyType): Promise<AnyType>;
  abstract getAvailableSlots(
    userId: string,
    days?: number
  ): Promise<AvailableSlotsResult>;
  abstract refreshToken(userId: string, tokens: TokenData): Promise<TokenData>;

  protected getTimezoneOffset(timezone: string, date: Date): number {
    try {
      // Use dayjs to calculate timezone offset
      const dateInTimezone = dayjs(date).tz(timezone);
      const dateInUtc = dayjs(date).utc();
      return (
        dateInTimezone.utcOffset() * 60 * 1000 -
        dateInUtc.utcOffset() * 60 * 1000
      );
    } catch (error) {
      this.logger.warn(
        `Error calculating timezone offset for ${timezone}:`,
        error
      );
      return 0;
    }
  }

  protected isTokenExpiringSoon(expiryDate: number | undefined): boolean {
    if (!expiryDate) return true;
    const fiveMinutesFromNow = dayjs().add(5, "minute").valueOf();
    return expiryDate <= fiveMinutesFromNow;
  }
}
