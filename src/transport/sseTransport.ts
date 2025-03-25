import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { PORT, PUBLIC_URL } from "../config/constants.js";
import { register } from './metrics.js';

/**
 * Set up the Express server with SSE transport
 */
export function setupSSETransport(server: Server) {
  const app = express();
  let transport: SSEServerTransport | null = null;

  // Add health endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Add metrics endpoint
  app.get("/metrics", async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err: unknown) {
      res.status(500).end(err instanceof Error ? err.message : 'Unknown error');
    }
  });

  // Handle SSE connections
  app.get("/sse", (req: Request, res: Response) => {
    console.error("SSE connection established");
    transport = new SSEServerTransport("/messages", res);

    req.on('close', () => {
      console.error("Client disconnected");
      transport = null;
    });

    server.connect(transport)
      .then(() => console.error("Brave Search MCP Server connected to transport"))
      .catch((err: unknown) => console.error("Failed to connect server to transport:", err instanceof Error ? err.message : err));
  });

  // Handle POST messages from client
  app.post("/messages", (req: Request, res: Response) => {
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
      console.error(`Metrics endpoint available at ${PUBLIC_URL}/metrics`);
    } else {
      console.error('SSE endpoint available at /sse');
      console.error('Health endpoint available at /health');
      console.error('Metrics endpoint available at /metrics');
    }
  });
} 