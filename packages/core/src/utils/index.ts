/**
 * @ltcg/core/utils - Shared utility functions
 *
 * Pure utility functions used across the monorepo.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for constructing className strings conditionally.
 * Combines clsx for conditional classes with tailwind-merge
 * for intelligent Tailwind CSS class merging.
 *
 * @example
 * cn("px-4", condition && "py-2", "bg-blue-500")
 * cn("text-red-500", { "font-bold": isActive })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export ClassValue type for consumers who need it
export type { ClassValue };
