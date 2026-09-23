import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";

// Extend dayjs with required plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

export const toUTC = (date?: string | number | Date | dayjs.Dayjs) => {
  return dayjs.utc(date).toDate();
};

export const utcDayjs = (date?: string | number | Date | dayjs.Dayjs) => {
  return dayjs(date).utc();
};

export { dayjs };
