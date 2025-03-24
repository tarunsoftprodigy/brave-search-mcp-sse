import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { PORT } from "../config/constants.js";

/**
 * Set up the Express server with SSE transport
 */
export function setupSSETransport(server: Server) {
  const app = express();
  let transport: SSEServerTransport | null = null;

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
    console.error(`Brave Search MCP Server running at http://localhost:${PORT}`);
    console.error(`Connect to SSE endpoint at http://localhost:${PORT}/sse`);
  });
} 