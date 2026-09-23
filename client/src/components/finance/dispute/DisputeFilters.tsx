import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FinanceFilterBar } from "@/components/finance/FinanceFilterBar";

interface DisputeFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
}

export function DisputeFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
}: DisputeFiltersProps) {
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (priority !== "all" ? 1 : 0);

  return (
    <FinanceFilterBar
      className="mb-6"
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search disputes by reason..."
      activeFilterCount={activeFilterCount}
      renderInlineFilters={() => (
        <>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full rounded-xl bg-background lg:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-full rounded-xl bg-background lg:w-48">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
    />
  );
}
