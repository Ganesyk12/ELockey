import type { NextFunction, Request, Response } from "express";
import { getSession, hasSession } from "./session";

export function extractToken(req: Request): string | undefined {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "");
}

/** Requires a logged-in user session; attaches req.userId / req.username. */
export function requireLogin(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const session = token ? getSession(token) : undefined;
  if (!session) {
    res.status(401).json({ error: "Not logged in. Run POST /api/login first." });
    return;
  }
  req.token = token!;
  req.session = session;
  req.userId = session.userId;
  req.username = session.username;
  next();
}

/** Requires an unlocked master key in the session; attaches req.masterKey. */
export function requireUnlocked(req: Request, res: Response, next: NextFunction) {
  if (!hasSession(req.token) || !req.session?.masterKey) {
    res.status(401).json({ error: "Vault is locked. Unlock with POST /api/unlock." });
    return;
  }
  req.masterKey = req.session.masterKey;
  next();
}
