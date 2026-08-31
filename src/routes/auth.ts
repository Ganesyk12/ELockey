import { randomBytes } from "node:crypto";
import { Router } from "express";
import { db } from "../prisma/db";
import { hashMasterKey, verifyMasterKey } from "../config/crypto";
import {
  createSession,
  setMasterKey,
  unsetMasterKey,
} from "../session";
import { extractToken, requireLogin } from "../middleware";

export const authRouter = Router();

authRouter.get("/status", async (_req, res) => {
  const anyUser = await db.user.findFirst({ select: { id: true } });
  res.json({ setup: !!anyUser });
});

authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required." });
    return;
  }
  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    res.status(409).json({ error: "Username already taken." });
    return;
  }
  const { salt, hash } = hashMasterKey(password);
  await db.user.create({
    data: { username, password: [salt, hash].join(".") },
  });
  res.status(201).json({ ok: true });
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required." });
    return;
  }
  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }
  const storedPassword = user.password.split(".");
  const salt = storedPassword[0];
  const hash = storedPassword[1];
  if (!salt || !hash) {
    res.status(500).json({ error: "Corrupted user password record." });
    return;
  }
  if (!verifyMasterKey(password, { salt, hash })) {
    res.status(401).json({ error: "Invalid credentials." });
    return;
  }
  const token = randomBytes(32).toString("hex");
  createSession(token, { userId: user.id, username: user.username });
  res.json({ ok: true, token });
});

authRouter.post("/setKey", requireLogin, async (req, res) => {
  const { masterKey } = req.body as { masterKey?: string };
  if (!masterKey) {
    res.status(400).json({ error: "masterKey is required." });
    return;
  }
  const { salt, hash } = hashMasterKey(masterKey);
  await db.user.update({
    where: { id: req.userId },
    data: { masterSalt: salt, masterHash: hash },
  });
  res.json({ ok: true });
});

authRouter.post("/unlock", requireLogin, async (req, res) => {
  const { masterKey } = req.body as { masterKey?: string };
  if (!masterKey) {
    res.status(400).json({ error: "masterKey is required." });
    return;
  }
  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user?.masterHash) {
    res.status(400).json({ error: "Master key not set. Run POST /api/setKey first." });
    return;
  }
  if (!verifyMasterKey(masterKey, { salt: user.masterSalt, hash: user.masterHash })) {
    res.status(401).json({ error: "Invalid master key." });
    return;
  }
  const token = extractToken(req)!;
  setMasterKey(token, masterKey);
  res.json({ ok: true });
});

authRouter.post("/lock", requireLogin, (req, res) => {
  const token = extractToken(req)!;
  unsetMasterKey(token);
  res.json({ ok: true });
});