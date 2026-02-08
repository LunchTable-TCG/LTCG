#!/usr/bin/env node
/**
 * HTTP Server Entry Point for MCP Server
 * Starts the MCP server with HTTP transport using Hono
 *
 * Environment variables:
 * - PORT: HTTP server port (default: 3000)
 * - LTCG_API_KEY: API key for LunchTable-TCG backend (required)
 * - CONVEX_SITE_URL: Base URL for Convex HTTP actions (default: https://lunchtable.convex.site)
 * - MCP_API_KEY: Optional API key for authenticating MCP clients
 * - ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins (default: *)
 */

import { createMcpServer } from "./server-setup.js";
import { createHttpTransport } from "./http-transport.js";
import { getConfig, validateConfig } from "./config.js";

/**
 * Main function to start the HTTP server
 */
async function main() {
  // Validate configuration
  validateConfig();
  const config = getConfig();

  console.error("Starting LunchTable-TCG MCP Server (HTTP mode)");
  console.error(`Port: ${config.httpPort}`);
  console.error(`API URL: ${config.apiUrl}`);
  console.error(`CORS Origins: ${config.allowedOrigins.join(", ")}`);
  console.error(
    `Authentication: ${config.mcpApiKey ? "Enabled" : "Disabled (public access)"}`
  );

  // Create MCP server instance
  const mcpServer = createMcpServer();

  // Create HTTP transport (async — connects SDK transport to server)
  const app = await createHttpTransport(mcpServer);

  // Start Bun server
  const server = Bun.serve({
    fetch: app.fetch,
    port: config.httpPort,
    hostname: "0.0.0.0", // Listen on all interfaces for cloud deployment
  });

  console.error(`\nMCP HTTP Server listening on http://0.0.0.0:${server.port}`);
  console.error(`Health check: http://0.0.0.0:${server.port}/health`);
  console.error(`MCP endpoint: http://0.0.0.0:${server.port}/mcp`);
  console.error("\nServer is ready to accept connections.");

  // Graceful shutdown handler
  const shutdown = async () => {
    console.error("\nShutting down HTTP server...");
    server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Start the server
main().catch((error) => {
  console.error("Fatal error starting HTTP server:", error);
  process.exit(1);
});
