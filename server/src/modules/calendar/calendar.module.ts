import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ProfilesModule } from "modules/profiles/profiles.module";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { CalendarTokenService } from "./shared/calendar-token.service";
import { ScheduledMeetingService } from "./shared/scheduled-meeting.service";
import { GoogleCalendarService } from "./google/google-calendar.service";
import { MicrosoftCalendarService } from "./microsoft/microsoft-calendar.service";
import { MicrosoftCalendarValidationService } from "./microsoft/microsoft-calendar.validation.service";
import { MicrosoftMeetingBookingService } from "./microsoft/microsoft-meeting-booking.service";

@Module({
  imports: [ConfigModule, ProfilesModule],
  controllers: [CalendarController],
  providers: [
    CalendarService,
    CalendarTokenService,
    ScheduledMeetingService,
    GoogleCalendarService,
    MicrosoftCalendarValidationService,
    MicrosoftCalendarService,
    MicrosoftMeetingBookingService,
  ],
  exports: [
    CalendarService,
    CalendarTokenService,
    GoogleCalendarService,
    MicrosoftCalendarValidationService,
    MicrosoftCalendarService,
    MicrosoftMeetingBookingService,
  ],
})
export class CalendarModule {}
