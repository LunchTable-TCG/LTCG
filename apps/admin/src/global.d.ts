// Type declarations for CSS imports
// Allows: import "./globals.css"
declare module "*.css";

// Window interface extensions for debug utilities
interface Window {
  enableDebugMode?: () => void;
  disableDebugMode?: () => void;
  logger?: {
    debug: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
    userAction: (action: string, context?: Record<string, unknown>) => void;
    navigation: (from: string, to: string) => void;
    apiCall: (endpoint: string, method: string, context?: Record<string, unknown>) => void;
    render: (component: string, props?: Record<string, unknown>) => void;
  };
}
