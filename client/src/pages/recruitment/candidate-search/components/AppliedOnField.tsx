import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";

interface AppliedOnFieldProps {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

const CALENDAR_DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toCalendarDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const match = CALENDAR_DAY_RE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }
  return date;
}

function toCriteriaDate(value: Date | undefined): string | null {
  if (!value) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Adapts criteria `YYYY-MM-DD` strings to the shared DateRangePicker. */
export function AppliedOnField({ from, to, onChange }: AppliedOnFieldProps) {
  const value: DateRangeValue = {
    preset: from || to ? "custom" : "all",
    startDate: toCalendarDate(from),
    endDate: toCalendarDate(to),
  };

  return (
    <DateRangePicker
      value={value}
      onChange={(next) =>
        onChange(toCriteriaDate(next.startDate), toCriteriaDate(next.endDate))
      }
      testIdPrefix="candidate-search-applied"
    />
  );
}
