import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import "./index.css";
import type { UUID } from "@elizaos/core";
import React from "react";
import { ErrorBoundary } from "./components";
import { DecisionStream } from "./panels/DecisionStream";
import { GameDashboard } from "./panels/GameDashboard";
import { MatchmakingPanel } from "./panels/MatchmakingPanel";
import { MetricsPanel } from "./panels/MetricsPanel";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce refetches on window focus for better performance
      refetchOnWindowFocus: false,
      // Retry failed requests with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable request deduplication
      structuralSharing: true,
    },
  },
});

// Define the interface for the ELIZA_CONFIG
interface ElizaConfig {
  agentId: string;
  apiBase: string;
}

// Declare global window extension for TypeScript
declare global {
  interface Window {
    ELIZA_CONFIG?: ElizaConfig;
  }
}

/**
 * Main Example route component
 */
function ExampleRoute() {
  const config = window.ELIZA_CONFIG;
  const agentId = config?.agentId;

  // Apply dark mode to the root element
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (!agentId) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 font-medium">Error: Agent ID not found</div>
        <div className="text-sm text-gray-600 mt-2">
          The server should inject the agent ID configuration.
        </div>
      </div>
    );
  }

  return <ExampleProvider agentId={agentId as UUID} />;
}

/**
 * Example provider component - renders the Matchmaking Panel for development
 */
function ExampleProvider({ agentId }: { agentId: UUID }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MatchmakingPanel agentId={agentId} />
    </QueryClientProvider>
  );
}

// Initialize the application - no router needed for iframe
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<ExampleRoute />);
}

/**
 * Props interface for panel components
 */
export interface PanelProps {
  agentId: UUID;
  [key: string]: unknown;
}

// Define types for integration with agent UI system
export interface AgentPanel {
  name: string;
  path: string;
  component: React.ComponentType<PanelProps>;
  icon?: string;
  public?: boolean;
  shortLabel?: string; // Optional short label for mobile
}

/**
 * Wrap panels with ErrorBoundary for production resilience
 */
function withErrorBoundary<P extends PanelProps>(Component: React.ComponentType<P>) {
  return function WrappedPanel(props: P) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Export the panel configuration for integration with the agent UI
 */
export const panels: AgentPanel[] = [
  {
    name: "Matchmaking",
    path: "ltcg-matchmaking",
    component: withErrorBoundary(MatchmakingPanel),
    icon: "Target",
    public: false,
    shortLabel: "Match",
  },
  {
    name: "Game",
    path: "ltcg-game",
    component: withErrorBoundary(GameDashboard),
    icon: "Gamepad2",
    public: false,
    shortLabel: "Game",
  },
  {
    name: "Decisions",
    path: "ltcg-decisions",
    component: withErrorBoundary(DecisionStream),
    icon: "Brain",
    public: false,
    shortLabel: "AI",
  },
  {
    name: "Metrics",
    path: "ltcg-metrics",
    component: withErrorBoundary(MetricsPanel),
    icon: "BarChart3",
    public: false,
    shortLabel: "Stats",
  },
];

export * from "./utils";
