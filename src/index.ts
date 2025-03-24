#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import configuration
import { SERVER_INFO, BRAVE_API_KEY } from './config/constants.js';

// Import tools
import { WEB_SEARCH_TOOL, handleWebSearch } from './tools/webSearch.js';
import { LOCAL_SEARCH_TOOL, handleLocalSearch } from './tools/localSearch.js';

// Import transport
import { setupSSETransport } from './transport/sseTransport.js';

// Check for API key
if (!BRAVE_API_KEY) {
  console.error("Error: BRAVE_API_KEY environment variable is required");
  process.exit(1);
}

// Server implementation
const server = new Server(
  SERVER_INFO,
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [WEB_SEARCH_TOOL, LOCAL_SEARCH_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "brave_web_search":
        return await handleWebSearch(args);

      case "brave_local_search":
        return await handleLocalSearch(args);

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server with SSE transport
setupSSETransport(server).on('error', (error: Error) => {
  console.error("Server error:", error);
  process.exit(1);
});
