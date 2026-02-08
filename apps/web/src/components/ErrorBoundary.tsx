"use client";

import { logger } from "@/lib/debug";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  boundaryName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Component
 *
 * Catches React errors in component tree and displays fallback UI
 * Logs all errors with full context for debugging
 *
 * Usage:
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, boundaryName = "ErrorBoundary" } = this.props;

    // Log error with full context
    logger.error(`Error caught by ${boundaryName}`, error, {
      component: boundaryName,
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    logger.info("Error boundary reset", { component: this.props.boundaryName });
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">An unexpected error occurred</p>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && error && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="text-xs font-mono text-destructive mb-2">{error.message}</p>
                {errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-40 text-muted-foreground">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook to wrap async operations with error boundary-like behavior
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      logger.error("Async error caught", error);
      throw error; // Re-throw to be caught by nearest error boundary
    }
  }, [error]);

  return setError;
}

/**
 * Game-specific error boundary with game state recovery
 */
export function GameErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      boundaryName="GameErrorBoundary"
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-2xl font-bold mb-2">Game Error</h1>
            <p className="text-muted-foreground mb-6">
              The game encountered an error. Your progress has been saved.
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/lunchtable";
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
