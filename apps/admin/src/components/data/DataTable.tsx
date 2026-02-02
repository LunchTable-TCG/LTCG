"use client";

/**
 * DataTable Component
 *
 * A fully typed, reusable data table with sorting, filtering, and pagination.
 * Uses shadcn/ui Table components under the hood.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ColumnDef, TableState } from "@/types";
import { type ReactNode, useCallback, useMemo, useState } from "react";

// =============================================================================
// Types
// =============================================================================

interface DataTableProps<T extends object> {
  /** Array of data to display */
  data: T[] | undefined;
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Unique key for each row */
  rowKey: keyof T;
  /** Loading state */
  isLoading?: boolean;
  /** Whether to show search input */
  searchable?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Columns to search in */
  searchColumns?: (keyof T)[];
  /** Number of rows per page */
  pageSize?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Action when row is clicked */
  onRowClick?: (row: T) => void;
  /** Additional actions for each row */
  rowActions?: (row: T) => ReactNode;
  /** Header actions (like "Add New" button) */
  headerActions?: ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function DataTable<T extends object>({
  data,
  columns,
  rowKey,
  isLoading = false,
  searchable = false,
  searchPlaceholder = "Search...",
  searchColumns = [],
  pageSize = 10,
  emptyMessage = "No data found",
  onRowClick,
  rowActions,
  headerActions,
}: DataTableProps<T>) {
  // Table state
  const [state, setState] = useState<TableState>({
    page: 0,
    pageSize,
    filters: {},
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Sort handler
  const handleSort = useCallback((columnId: string) => {
    setState((prev) => ({
      ...prev,
      sortColumn: columnId,
      sortDirection: prev.sortColumn === columnId && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    let result = [...data];

    // Apply search filter
    if (searchQuery && searchColumns.length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        searchColumns.some((col) => {
          const value = row[col];
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply sorting
    if (state.sortColumn) {
      const column = columns.find((col) => col.id === state.sortColumn);
      if (column) {
        result.sort((a, b) => {
          const aValue = column.accessorFn
            ? column.accessorFn(a)
            : column.accessorKey
              ? a[column.accessorKey]
              : null;
          const bValue = column.accessorFn
            ? column.accessorFn(b)
            : column.accessorKey
              ? b[column.accessorKey]
              : null;

          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;

          const comparison =
            typeof aValue === "string" && typeof bValue === "string"
              ? aValue.localeCompare(bValue)
              : Number(aValue) - Number(bValue);

          return state.sortDirection === "desc" ? -comparison : comparison;
        });
      }
    }

    return result;
  }, [data, searchQuery, searchColumns, state.sortColumn, state.sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / state.pageSize);
  const paginatedData = processedData.slice(
    state.page * state.pageSize,
    (state.page + 1) * state.pageSize
  );

  // Get cell value
  const getCellValue = (row: T, column: ColumnDef<T>): ReactNode => {
    // Custom cell renderer
    if (column.cell) {
      return column.cell(row);
    }

    // Accessor function
    if (column.accessorFn) {
      const value = column.accessorFn(row);
      return String(value ?? "");
    }

    // Direct accessor key
    if (column.accessorKey) {
      const value = row[column.accessorKey];
      return String(value ?? "");
    }

    return "";
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        {headerActions && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-[250px]" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        )}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={String(column.id)}>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={String(column.id)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      {(searchable || headerActions) && (
        <div className="flex items-center justify-between gap-4">
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setState((prev) => ({ ...prev, page: 0 }));
              }}
              className="max-w-sm"
            />
          )}
          {headerActions}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={String(column.id)}
                  style={{ width: column.width }}
                  className={column.sortable ? "cursor-pointer select-none" : ""}
                  onClick={() => column.sortable && handleSort(String(column.id))}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && state.sortColumn === column.id && (
                      <span>{state.sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow
                  key={String(row[rowKey])}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.id)}>{getCellValue(row, column)}</TableCell>
                  ))}
                  {rowActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>{rowActions(row)}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {state.page * state.pageSize + 1} to{" "}
            {Math.min((state.page + 1) * state.pageSize, processedData.length)} of{" "}
            {processedData.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={state.page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {state.page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={state.page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
