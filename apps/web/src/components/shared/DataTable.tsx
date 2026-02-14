"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

/**
 * DataTable - A zine-style table with high contrast and ink-bleed styling.
 * Matches the LunchTable gritty aesthetic with bold borders and paper textures.
 */
export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = "No records found.",
  isLoading = false,
}: DataTableProps<T>) {
  return (
    <div className={cn("paper-panel overflow-hidden flex flex-col", className)}>
      <div className="overflow-x-auto tcg-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-4 border-primary bg-muted/30">
              {columns.map((column, idx) => (
                <th
                  key={`header-${idx}`}
                  className={cn(
                    "px-4 py-3 text-xs font-black uppercase tracking-widest ink-bleed",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-primary/10">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <tr key={`loading-${i}`} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={`loading-cell-${j}`} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((item, rowIdx) => (
                <motion.tr
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: rowIdx * 0.05 }}
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "group transition-colors",
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                  )}
                >
                  {columns.map((column, colIdx) => (
                    <td
                      key={`cell-${rowIdx}-${colIdx}`}
                      className={cn(
                        "px-4 py-4 text-sm font-bold uppercase tracking-tight transition-colors",
                        "group-hover:text-primary",
                        column.className
                      )}
                    >
                      {typeof column.accessor === "function"
                        ? column.accessor(item)
                        : (item[column.accessor] as ReactNode)}
                    </td>
                  ))}
                </motion.tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-20 text-center text-muted-foreground font-bold italic uppercase"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
