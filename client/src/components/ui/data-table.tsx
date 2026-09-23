import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  sortable?: boolean;
  minWidth?: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (item: T, index: number) => React.ReactNode;
}

// Constrained map of supported column min-widths. Tailwind only generates the
// arbitrary `min-w-[…]` utilities listed here, so a column's `minWidth` must be
// one of these literal values to take effect.
const MIN_WIDTH_CLASS: Record<string, string> = {
  "70px": "min-w-[70px]",
  "100px": "min-w-[100px]",
  "110px": "min-w-[110px]",
  "120px": "min-w-[120px]",
  "140px": "min-w-[140px]",
  "150px": "min-w-[150px]",
  "160px": "min-w-[160px]",
  "180px": "min-w-[180px]",
};

export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  title?: string;
  titleIcon?: React.ReactNode;
  description?: string;
  loading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (column: string) => void;
  onRowClick?: (item: T) => void;
  getRowKey: (item: T) => string;
  inlineHeaderContent?: React.ReactNode;
  headerContent?: React.ReactNode;
  testIdPrefix?: string;
}

export function DataTable<T>({
  data,
  columns,
  title,
  titleIcon,
  description,
  loading = false,
  emptyIcon,
  emptyTitle = "No Data Found",
  emptyDescription = "No items to display",
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showSearch = true,
  pagination,
  onPageChange,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
  getRowKey,
  inlineHeaderContent,
  headerContent,
  testIdPrefix = "data-table",
}: DataTableProps<T>) {
  const getSortIcon = (columnKey: string) => {
    if (!onSort) return null;
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  const renderHeader = (column: DataTableColumn<T>) => {
    if (column.sortable && onSort) {
      return (
        <Button
          type="button"
          variant="ghost"
          className="flex h-auto items-center gap-1.5 p-0 text-[11px] uppercase tracking-wider font-bold text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
          onClick={() => onSort(column.key)}
          data-testid={`${testIdPrefix}-sort-${column.key}`}
        >
          {column.header}
          {getSortIcon(column.key)}
        </Button>
      );
    }

    if (typeof column.header === "string") {
      return (
        <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
          {column.header}
        </span>
      );
    }

    return column.header;
  };

  const showTableMetaHeader = Boolean(title || description);

  return (
    <Card className="rounded-2xl border border-border shadow-md bg-white">
      {showTableMetaHeader && (
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div
            className={cn(
              "flex flex-col sm:flex-row sm:items-center gap-4",
              title || description ? "sm:justify-between" : "sm:justify-end"
            )}
          >
            {(title || description) && (
              <div>
                {title && (
                  <CardTitle className="text-xl flex items-center gap-2">
                    {titleIcon}
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <CardDescription className="mt-1">
                    {description}
                  </CardDescription>
                )}
              </div>
            )}
            {pagination && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full">
                <span className="font-semibold text-foreground">
                  {pagination.totalItems}
                </span>{" "}
                items
              </div>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent
        className={cn("space-y-5", showTableMetaHeader ? "pt-5" : "pt-6")}
      >
        {(showSearch || inlineHeaderContent || headerContent) && (
          <div className="flex flex-col gap-3">
            {(showSearch || inlineHeaderContent) && (
              <div className="flex flex-col sm:flex-row gap-3">
                {showSearch && onSearchChange && (
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchValue}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-9 rounded-xl bg-background focus-visible:ring-2 focus-visible:ring-brand-amethyst/20 focus-visible:ring-offset-0"
                      data-testid={`${testIdPrefix}-search`}
                    />
                  </div>
                )}
                {inlineHeaderContent}
              </div>
            )}
            {headerContent}
          </div>
        )}

        {loading ? (
          <Loader size="lg" message="Loading..." />
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {emptyIcon && (
              <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-amethyst/10 text-brand-amethyst">
                {emptyIcon}
              </div>
            )}
            <h3 className="text-lg font-semibold mb-1">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {emptyDescription}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={cn(
                          column.minWidth && MIN_WIDTH_CLASS[column.minWidth],
                          column.headerClassName
                        )}
                      >
                        {renderHeader(column)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow
                      key={getRowKey(item)}
                      className={cn(
                        "group border-b border-border/50 transition-colors hover:bg-brand-amethyst/5",
                        onRowClick &&
                          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amethyst/40"
                      )}
                      onClick={onRowClick ? () => onRowClick(item) : undefined}
                      role={onRowClick ? "button" : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onRowClick(item);
                              }
                            }
                          : undefined
                      }
                      data-testid={`${testIdPrefix}-row-${getRowKey(item)}`}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={cn("py-4", column.cellClassName)}
                        >
                          {column.render(item, index)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && onPageChange && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-1">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {Math.min(
                      pagination.currentPage * pagination.itemsPerPage,
                      pagination.totalItems
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {pagination.totalItems}
                  </span>{" "}
                  items
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => onPageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                    data-testid={`${testIdPrefix}-prev-page`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Previous</span>
                  </Button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (
                          pagination.currentPage >=
                          pagination.totalPages - 2
                        ) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-8 w-8 p-0",
                              pagination.currentPage === pageNum
                                ? "border-transparent bg-brand-gradient text-brand-foreground shadow-brand-cta hover:text-brand-foreground"
                                : "hover:bg-brand-amethyst/10 hover:text-brand-amethyst"
                            )}
                            onClick={() => onPageChange(pageNum)}
                            data-testid={`${testIdPrefix}-page-${pageNum}`}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => onPageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    data-testid={`${testIdPrefix}-next-page`}
                  >
                    <span className="hidden sm:inline mr-1">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
