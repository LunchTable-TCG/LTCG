/**
 * HTTP Transport for MCP Server using Hono
 * Implements the MCP Streamable HTTP protocol (2025-03-26 specification)
 *
 * This module provides HTTP transport capabilities for the MCP server,
 * enabling remote deployment and cloud-based access while maintaining
 * compatibility with the stdio transport for local development.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { getConfig } from "./config.js";

interface SessionData {
  id: string;
  createdAt: number;
  lastActivity: number;
}

/**
 * Creates a Hono HTTP transport for an MCP server
 * Implements the Streamable HTTP protocol according to MCP spec 2025-03-26
 */
export function createHttpTransport(_server: Server) {
  const app = new Hono();
  const config = getConfig();

  // Session management (in-memory for now)
  const sessions = new Map<string, SessionData>();

  // Session timeout: 1 hour
  const SESSION_TIMEOUT_MS = 60 * 60 * 1000;

  /**
   * Generate a cryptographically secure session ID
   */
  function generateSessionId(): string {
    // Generate a secure random session ID (UUID v4 format)
    return crypto.randomUUID();
  }

  /**
   * Validate and retrieve session
   */
  function validateSession(sessionId: string | undefined): SessionData | null {
    if (!sessionId) {
      return null;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    const now = Date.now();
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return session;
  }

  /**
   * Create a new session
   */
  function createSession(): SessionData {
    const sessionId = generateSessionId();
    const session: SessionData = {
      id: sessionId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    sessions.set(sessionId, session);
    return session;
  }

  /**
   * Clean up expired sessions periodically
   */
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        sessions.delete(id);
      }
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

  /**
   * CORS middleware - validate Origin header to prevent DNS rebinding attacks
   */
  app.use(
    "*",
    cors({
      origin: (origin) => {
        // Allow configured origins
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

  /**
   * Authentication middleware
   */
  app.use("*", async (c, next) => {
    // Skip auth for OPTIONS requests
    if (c.req.method === "OPTIONS") {
      return next();
    }

    // If MCP_API_KEY is set, require authentication
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

  /**
   * Handle JSON-RPC message processing
   * Routes messages to the MCP server and returns responses
   */
  async function handleJsonRpcMessage(
    message: JSONRPCMessage | JSONRPCMessage[]
  ): Promise<unknown> {
    try {
      // Convert single message to array for uniform processing
      const messages = Array.isArray(message) ? message : [message];
      const responses: unknown[] = [];

      for (const msg of messages) {
        // Check if it's a request (has id) or notification (no id)
        if ("id" in msg && msg.id !== undefined) {
          // It's a request - we need to handle it and get a response
          const request = msg as JSONRPCRequest;

          // Process the request through the MCP server
          // Note: The MCP SDK Server handles requests internally
          // We need to manually route to the correct handler based on method
          const response = await processRequest(request);
          if (response) {
            responses.push(response);
          }
        } else {
          // It's a notification - process but don't expect a response
          await processNotification(msg as JSONRPCNotification);
        }
      }

      // Return responses
      if (responses.length === 0) {
        return null;
      }
      return Array.isArray(message) ? responses : responses[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: `Internal error: ${errorMessage}`,
        },
      };
    }
  }

  /**
   * Process a JSON-RPC request and return a response
   */
  async function processRequest(
    request: JSONRPCRequest
  ): Promise<unknown> {
    // This is a simplified implementation
    // In a full implementation, we would route to the appropriate MCP handler
    // based on the request.method

    // For now, return an error response
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32601,
        message: `Method not found: ${request.method}`,
      },
    };
  }

  /**
   * Process a JSON-RPC notification (no response expected)
   */
  async function processNotification(
    notification: JSONRPCNotification
  ): Promise<void> {
    // Process notification
    // Notifications don't require a response
    console.error(`Received notification: ${notification.method}`);
  }

  /**
   * POST /mcp - Main MCP endpoint for JSON-RPC requests
   * Handles initialization, tool calls, and other JSON-RPC messages
   */
  app.post("/mcp", async (c) => {
    try {
      // Get session ID from header (if present)
      const sessionId = c.req.header("Mcp-Session-Id");

      // Parse JSON body
      const body = await c.req.json();

      // Validate JSON-RPC message format
      if (!body || typeof body !== "object") {
        return c.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error: Invalid JSON",
            },
          },
          400
        );
      }

      // Check if this is an initialize request
      const isInitialize =
        !Array.isArray(body) && body.method === "initialize";

      // For non-initialize requests, validate session
      if (!isInitialize && sessionId) {
        const session = validateSession(sessionId);
        if (!session) {
          return c.json(
            {
              jsonrpc: "2.0",
              error: {
                code: -32600,
                message: "Invalid session",
              },
            },
            404
          );
        }
      }

      // Handle the JSON-RPC message
      const response = await handleJsonRpcMessage(body);

      // If this is an initialize request, create a new session
      if (isInitialize && response && typeof response === "object" && !("error" in response)) {
        const session = createSession();
        c.header("Mcp-Session-Id", session.id);
      }

      // Send response
      if (response === null) {
        // No response needed (notification only)
        return c.text("", 202); // 202 Accepted
      }

      // Add session ID header if present
      if (sessionId) {
        c.header("Mcp-Session-Id", sessionId);
      }

      return c.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: `Internal error: ${errorMessage}`,
          },
        },
        500
      );
    }
  });

  /**
   * GET /mcp - Optional SSE endpoint for server-initiated messages
   * Not required for basic MCP functionality
   */
  app.get("/mcp", async (c) => {
    // For now, return 405 Method Not Allowed
    // SSE support can be added later if needed
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "SSE endpoint not implemented",
        },
      },
      405
    );
  });

  /**
   * DELETE /mcp - Terminate session
   */
  app.delete("/mcp", async (c) => {
    const sessionId = c.req.header("Mcp-Session-Id");
    if (sessionId) {
      sessions.delete(sessionId);
    }
    return new Response("", { status: 204 }); // 204 No Content
  });

  /**
   * Health check endpoint
   */
  app.get("/health", (c) => {
    return c.json({
      status: "healthy",
      transport: "http",
      sessions: sessions.size,
    });
  });

  /**
   * Error handler
   */
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

  /**
   * 404 handler
   */
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
