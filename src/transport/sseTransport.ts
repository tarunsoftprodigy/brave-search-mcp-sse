import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { PORT, PUBLIC_URL } from "../config/constants.js";

/**
 * Set up the Express server with SSE transport
 */
export function setupSSETransport(server: Server) {
  const app = express();
  let transport: SSEServerTransport | null = null;

  // Add health endpoint
  app.get("/health", (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Handle SSE connections
  app.get("/sse", (req, res) => {
    console.error("SSE connection established");
    transport = new SSEServerTransport("/messages", res);

    req.on('close', () => {
      console.error("Client disconnected");
      transport = null;
    });

    server.connect(transport)
      .then(() => console.error("Brave Search MCP Server connected to transport"))
      .catch(err => console.error("Failed to connect server to transport:", err));
  });

  // Handle POST messages from client
  app.post("/messages", (req, res) => {
    if (transport) {
      transport.handlePostMessage(req, res);
    } else {
      console.error("Message received but no active transport");
      res.status(400).send({ error: "No active transport" });
    }
  });

  // Start the server
  return app.listen(PORT, () => {
    console.error(`Brave Search MCP Server running on port ${PORT}`);
    if (PUBLIC_URL) {
      console.error(`Server accessible at ${PUBLIC_URL}`);
      console.error(`SSE endpoint available at ${PUBLIC_URL}/sse`);
      console.error(`Health endpoint available at ${PUBLIC_URL}/health`);
    } else {
      console.error('SSE endpoint available at /sse');
      console.error('Health endpoint available at /health');
    }
  });
} 