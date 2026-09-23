import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DateRangePicker,
  DateRangeValue,
} from "@/components/ui/date-range-picker";
import { CalendarDays } from "lucide-react";
import { FinanceFilterBar } from "@/components/finance/FinanceFilterBar";

interface RequesterSpendingFiltersProps {
  search: string;
  status: string;
  dateValue: DateRangeValue;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateChange: (value: DateRangeValue) => void;
}

export function RequesterSpendingFilters({
  search,
  status,
  dateValue,
  onSearchChange,
  onStatusChange,
  onDateChange,
}: RequesterSpendingFiltersProps) {
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (dateValue.preset !== "all" ? 1 : 0);

  return (
    <FinanceFilterBar
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by job title, candidate, or amount..."
      activeFilterCount={activeFilterCount}
      renderInlineFilters={() => (
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full rounded-xl bg-background lg:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="authorized">Authorized</SelectItem>
            <SelectItem value="captured">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      )}
      renderSecondaryFilters={() => (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Date:</span>
          </div>
          <DateRangePicker
            value={dateValue}
            onChange={onDateChange}
            testIdPrefix="spending-date"
          />
        </div>
      )}
    />
  );
}
