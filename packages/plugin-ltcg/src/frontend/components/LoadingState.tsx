import { cn } from "../utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * Skeleton loader for stat cards
 */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-4 rounded-lg border border-border bg-card animate-pulse",
        className
      )}
    >
      <div className="h-3 w-20 bg-muted rounded" />
      <div className="h-8 w-16 bg-muted rounded mt-1" />
    </div>
  );
}

/**
 * Generic loading state with optional message
 */
export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

/**
 * Error state component
 */
export function ErrorState({
  message = "Something went wrong",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-destructive"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-destructive font-medium">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  title = "No data",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="flex flex-col items-center gap-2 text-center max-w-md">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
    </div>
  );
}
