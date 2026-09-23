import { Fragment } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PaginationInfo } from "@/hooks/useDisputes";

interface DisputeTablePaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function DisputeTablePagination({
  pagination,
  onPageChange,
  onLimitChange,
}: DisputeTablePaginationProps) {
  const { page, limit, total, totalPages } = pagination;
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, total);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/5">
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1} to {endIndex} of {total} disputes
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label
            htmlFor="rows-per-page"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Rows per page:
          </Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger id="rows-per-page" className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className={
                  page === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
              )
              .map((p, index, array) => (
                <Fragment key={p}>
                  {index > 0 && array[index - 1] !== p - 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => onPageChange(p)}
                      isActive={page === p}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                </Fragment>
              ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                className={
                  page === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
