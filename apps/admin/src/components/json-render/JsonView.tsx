"use client";

/**
 * JsonView Component
 *
 * Renders a JSON schema as React components using the admin catalog.
 * Supports streaming, error boundaries, and loading states.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRenderJson } from "@/lib/json-render";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Component, type ErrorInfo, Suspense } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface JsonSchema {
  type: string;
  props?: Record<string, unknown>;
  children?: JsonSchema | JsonSchema[];
}

interface JsonViewProps {
  /** The JSON schema to render */
  schema: JsonSchema | JsonSchema[] | null;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Fallback content while loading */
  loadingFallback?: ReactNode;
  /** Custom error display */
  errorFallback?: ReactNode;
  /** Title for the view */
  title?: string;
  /** Description for the view */
  description?: string;
  /** Whether to wrap in a card */
  asCard?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class JsonViewErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[JsonView] Render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-500">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Failed to render component</p>
              <p className="text-sm opacity-80">{this.state.error?.message}</p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// LOADING COMPONENT
// =============================================================================

function LoadingView() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// =============================================================================
// ERROR COMPONENT
// =============================================================================

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
      <div>
        <p className="font-medium text-destructive">Error rendering view</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function JsonView({
  schema,
  isLoading = false,
  error = null,
  loadingFallback,
  errorFallback,
  title,
  description,
  asCard = false,
  className = "",
}: JsonViewProps) {
  const render = useRenderJson();

  // Handle loading state
  if (isLoading) {
    return loadingFallback ?? <LoadingView />;
  }

  // Handle error state
  if (error) {
    return errorFallback ?? <ErrorView message={error} />;
  }

  // Handle empty schema
  if (!schema) {
    return null;
  }

  // Render the schema
  const content = (
    <JsonViewErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback ?? <LoadingView />}>
        <div className={`json-view ${className}`}>
          {Array.isArray(schema)
            ? schema.map((item, index) => <div key={index}>{render(item)}</div>)
            : render(schema)}
        </div>
      </Suspense>
    </JsonViewErrorBoundary>
  );

  // Wrap in card if requested
  if (asCard) {
    return (
      <Card>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </CardHeader>
        )}
        <CardContent className={title || description ? "" : "pt-6"}>{content}</CardContent>
      </Card>
    );
  }

  return content;
}

// =============================================================================
// EXAMPLE SCHEMAS (for documentation/testing)
// =============================================================================

export const exampleSchemas = {
  simpleMetrics: [
    {
      type: "Grid",
      props: { columns: 4, gap: "md" },
      children: [
        {
          type: "MetricCard",
          props: {
            title: "Total Users",
            value: "12,453",
            change: 12,
            changeType: "increase",
            icon: "👥",
          },
        },
        {
          type: "MetricCard",
          props: {
            title: "Active Games",
            value: 847,
            change: -3,
            changeType: "decrease",
            icon: "🎮",
          },
        },
        {
          type: "MetricCard",
          props: {
            title: "Revenue",
            value: "$24,500",
            change: 8,
            changeType: "increase",
            icon: "💰",
          },
        },
        {
          type: "MetricCard",
          props: {
            title: "Card Trades",
            value: "3,291",
            changeType: "neutral",
            icon: "🔄",
          },
        },
      ],
    },
  ],

  dashboard: {
    type: "Stack",
    props: { direction: "vertical", gap: "lg" },
    children: [
      {
        type: "Section",
        props: { title: "Overview", description: "Key metrics for today" },
        children: {
          type: "Grid",
          props: { columns: 3, gap: "md" },
          children: [
            {
              type: "MetricCard",
              props: { title: "Players Online", value: 1234, icon: "🎮" },
            },
            {
              type: "ProgressCard",
              props: {
                title: "Daily Goal",
                current: 750,
                total: 1000,
                description: "New signups",
              },
            },
            {
              type: "MetricCard",
              props: {
                title: "Revenue",
                value: "$5,432",
                change: 15,
                changeType: "increase",
              },
            },
          ],
        },
      },
      {
        type: "AlertBanner",
        props: {
          type: "info",
          title: "System Update",
          message: "Scheduled maintenance in 2 hours",
        },
      },
    ],
  },
};
