// middleware/auth.ts
import { Request, Response, NextFunction } from "express";

export function sseAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.query.auth;

  if (auth !== process.env.MCP_SSE_SECRET) {
    res.status(403).json({ error: "Forbidden: Invalid auth token." });
    return; // Important: stop further processing, but don't "return the res"
  }

  next();
}
