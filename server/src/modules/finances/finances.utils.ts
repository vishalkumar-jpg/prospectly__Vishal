import { utcDayjs } from "utils/dayjs";
import { DatePresetEnum } from "./finances.constants";

const parseLocalDate = (dateStr: string): Date => {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return utcDayjs()
      .set("year", year)
      .set("month", month)
      .set("date", day)
      .toDate();
  }
  return utcDayjs(dateStr).toDate();
};

export const getDateRangeFromPreset = (
  preset: DatePresetEnum | string,
  startDate?: string,
  endDate?: string
): { start: Date | null; end: Date | null } => {
  let start: Date | null = null;
  let end: Date | null = utcDayjs()
    .hour(23)
    .minute(59)
    .second(59)
    .millisecond(999)
    .toDate();

  switch (preset) {
    case DatePresetEnum.LAST_7_DAYS:
      start = utcDayjs().subtract(7, "day").startOf("day").toDate();
      break;
    case DatePresetEnum.LAST_30_DAYS:
      start = utcDayjs().subtract(30, "day").startOf("day").toDate();
      break;
    case DatePresetEnum.LAST_3_MONTHS:
      start = utcDayjs().subtract(3, "month").startOf("day").toDate();
      break;
    case DatePresetEnum.LAST_YEAR:
      start = utcDayjs().subtract(1, "year").startOf("day").toDate();
      break;
    case DatePresetEnum.CUSTOM:
      if (startDate) {
        start = parseLocalDate(startDate);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = parseLocalDate(endDate);
        end.setHours(23, 59, 59, 999);
      }
      break;
    case DatePresetEnum.ALL:
    default:
      start = null;
      end = null;
  }

  return { start, end };
};
