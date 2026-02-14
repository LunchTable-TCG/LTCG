/**
 * Configuration module for the LunchTable-TCG MCP server
 * Handles environment variable loading and validation
 */

export interface Config {
  apiKey: string;
  apiUrl: string;
  transport: "stdio" | "http";
  httpPort: number;
  allowedOrigins: string[];
  mcpApiKey?: string;
}

/**
 * Load and validate configuration from environment variables
 *
 * Required variables:
 * - LTCG_API_KEY: API key for authenticating with the LunchTable-TCG backend
 *
 * Optional variables:
 * - CONVEX_SITE_URL: Base URL for the Convex HTTP actions (e.g., "https://your-deployment.convex.site")
 * - MCP_TRANSPORT: Transport mode ("stdio" or "http", defaults to "stdio")
 * - PORT: HTTP server port (defaults to 3000, only used in http mode)
 * - ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins (defaults to "*")
 * - MCP_API_KEY: Optional API key for authenticating MCP clients in HTTP mode
 *
 * @throws {Error} If required environment variables are missing
 * @returns Configuration object with apiKey and apiUrl
 */
export function getConfig(): Config {
  const apiKey = process.env.LTCG_API_KEY;

  if (!apiKey) {
    throw new Error(
      "LTCG_API_KEY environment variable is required. Please set it in your .env file or as an environment variable."
    );
  }

  const apiUrl = process.env.CONVEX_SITE_URL;
  if (!apiUrl) {
    throw new Error(
      "CONVEX_SITE_URL environment variable is required. Set it to your Convex deployment site URL (e.g., https://your-deployment.convex.site)."
    );
  }

  const transport = (process.env.MCP_TRANSPORT || "stdio") as "stdio" | "http";
  if (transport !== "stdio" && transport !== "http") {
    throw new Error(
      'MCP_TRANSPORT must be either "stdio" or "http"'
    );
  }

  const httpPort = Number.parseInt(process.env.PORT || "3000", 10);
  if (Number.isNaN(httpPort) || httpPort < 1 || httpPort > 65535) {
    throw new Error("PORT must be a valid port number between 1 and 65535");
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["*"];

  const mcpApiKey = process.env.MCP_API_KEY;

  return {
    apiKey,
    apiUrl,
    transport,
    httpPort,
    allowedOrigins,
    mcpApiKey,
  };
}

/**
 * Validate configuration at startup
 * Call this early in your application initialization
 */
export function validateConfig(): void {
  try {
    getConfig();
  } catch (error) {
    console.error("Configuration validation failed:", error);
    process.exit(1);
  }
}
