#!/usr/bin/env node
/**
 * Main Entry Point for MCP Server
 * Supports dual-mode operation: stdio (local) and HTTP (remote)
 *
 * Transport mode is determined by the MCP_TRANSPORT environment variable:
 * - "stdio": Local stdio transport for Claude Desktop (default)
 * - "http": HTTP transport for remote deployment
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server-setup.js";
import { createHttpTransport } from "./http-transport.js";
import { getConfig, validateConfig } from "./config.js";

/**
 * Main function - determines transport mode and starts server
 */
async function main() {
  // Validate configuration
  validateConfig();
  const config = getConfig();

  // Check transport mode
  if (config.transport === "http") {
    // HTTP mode - start HTTP server
    console.error("Starting LunchTable-TCG MCP Server (HTTP mode)");
    console.error(`Port: ${config.httpPort}`);
    console.error(`API URL: ${config.apiUrl}`);
    console.error(`CORS Origins: ${config.allowedOrigins.join(", ")}`);
    console.error(
      `Authentication: ${config.mcpApiKey ? "Enabled" : "Disabled (public access)"}`
    );

    // Create MCP server instance
    const server = createMcpServer();

    // Create HTTP transport (async — connects SDK transport to server)
    const app = await createHttpTransport(server);

    // Start Bun server
    const bunServer = Bun.serve({
      fetch: app.fetch,
      port: config.httpPort,
      hostname: "0.0.0.0", // Listen on all interfaces for cloud deployment
    });

    console.error(`\nMCP HTTP Server listening on http://0.0.0.0:${bunServer.port}`);
    console.error(`Health check: http://0.0.0.0:${bunServer.port}/health`);
    console.error(`MCP endpoint: http://0.0.0.0:${bunServer.port}/mcp`);
    console.error("\nServer is ready to accept connections.");

    // Graceful shutdown handler
    const shutdown = async () => {
      console.error("\nShutting down HTTP server...");
      bunServer.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } else {
    // Stdio mode (default) - start stdio transport
    console.error("Starting LunchTable-TCG MCP Server (stdio mode)");
    console.error(`API URL: ${config.apiUrl}`);

    // Create MCP server instance
    const server = createMcpServer();

    // Create stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("LunchTable-TCG MCP server running on stdio");
  }
}

// Start the server
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
