/**
 * HTTP Transport for MCP Server using Hono + SDK StreamableHTTP
 *
 * Uses the official WebStandardStreamableHTTPServerTransport from the MCP SDK
 * instead of a custom JSON-RPC router. Hono handles routing, CORS, and auth;
 * the SDK transport handles the MCP protocol.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getConfig } from "./config.js";

/**
 * Creates a Hono HTTP app wired to an MCP server via the SDK's
 * WebStandardStreamableHTTPServerTransport (stateless mode).
 *
 * Accepts either McpServer or the low-level Server — both expose .connect().
 */
export async function createHttpTransport(server: McpServer | Server) {
  const app = new Hono();
  const config = getConfig();

  // ---------------------------------------------------------------------------
  // CORS middleware
  // ---------------------------------------------------------------------------
  app.use(
    "*",
    cors({
      origin: (origin) => {
        if (config.allowedOrigins.includes("*")) {
          return origin || "*";
        }
        if (origin && config.allowedOrigins.includes(origin)) {
          return origin;
        }
        return config.allowedOrigins[0] || "*";
      },
      allowHeaders: [
        "Content-Type",
        "Authorization",
        "Mcp-Session-Id",
        "Last-Event-ID",
      ],
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      exposeHeaders: ["Mcp-Session-Id"],
      credentials: true,
    })
  );

  // ---------------------------------------------------------------------------
  // Authentication middleware
  // ---------------------------------------------------------------------------
  app.use("*", async (c, next) => {
    // Skip auth for OPTIONS (pre-flight) and health checks
    if (c.req.method === "OPTIONS") {
      return next();
    }

    if (config.mcpApiKey) {
      const authHeader = c.req.header("Authorization");
      const apiKey = authHeader?.replace("Bearer ", "");

      if (!apiKey || apiKey !== config.mcpApiKey) {
        return c.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Unauthorized: Invalid or missing API key",
            },
          },
          401
        );
      }
    }

    return next();
  });

  // ---------------------------------------------------------------------------
  // SDK transport — stateless mode (sessionIdGenerator: undefined)
  // ---------------------------------------------------------------------------
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  // ---------------------------------------------------------------------------
  // Route /mcp through the SDK transport
  // All HTTP methods (POST, GET, DELETE) are handled by the SDK.
  // ---------------------------------------------------------------------------
  app.all("/mcp", async (c) => {
    try {
      const response = await transport.handleRequest(c.req.raw);
      return response;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: `Internal error: ${msg}` },
        },
        500
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------
  app.get("/health", (c) => {
    return c.json({
      status: "healthy",
      transport: "http",
    });
  });

  // ---------------------------------------------------------------------------
  // Error handler
  // ---------------------------------------------------------------------------
  app.onError((err, c) => {
    console.error("HTTP Transport Error:", err);
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Internal server error: ${err.message}`,
        },
      },
      500
    );
  });

  // ---------------------------------------------------------------------------
  // 404 handler
  // ---------------------------------------------------------------------------
  app.notFound((c) => {
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Endpoint not found",
        },
      },
      404
    );
  });

  return app;
}
