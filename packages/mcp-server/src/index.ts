#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Server setup
const server = new Server(
  {
    name: "@ltcg/mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool list handler (will be populated with tools)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Tools will be added here
  ],
}));

// Tool execution handler (will be implemented)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Tool execution logic will be added here
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LTCG MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
