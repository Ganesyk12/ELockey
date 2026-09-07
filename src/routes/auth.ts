import { randomBytes } from "node:crypto";
import { Router } from "express";
import { db } from "../prisma/db";
import {
  decrypt,
  encrypt,
  hashMasterKey,
  payloadToStored,
  storedToPayload,
  verifyMasterKey,
} from "../config/crypto";
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

authRouter.post("/updateKey", requireLogin, async (req, res) => {
  const { currentMasterKey, newMasterKey } = req.body as {
    currentMasterKey?: string;
    newMasterKey?: string;
  };
  if (!currentMasterKey || !newMasterKey) {
    res.status(400).json({ error: "currentMasterKey and newMasterKey are required." });
    return;
  }
  if (currentMasterKey === newMasterKey) {
    res.status(400).json({ error: "Master key baru harus berbeda dari master key saat ini." });
    return;
  }

  const user = await db.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  // Verify current master key (check masterHash if set, otherwise check password)
  let isCurrentKeyValid = false;
  if (user.masterHash && user.masterSalt) {
    isCurrentKeyValid = verifyMasterKey(currentMasterKey, { salt: user.masterSalt, hash: user.masterHash });
  } else {
    const [pSalt, pHash] = user.password.split(".");
    if (pSalt && pHash) {
      isCurrentKeyValid = verifyMasterKey(currentMasterKey, { salt: pSalt, hash: pHash });
    }
  }

  if (!isCurrentKeyValid) {
    res.status(401).json({ error: "Master key saat ini tidak valid / salah." });
    return;
  }

  // Fetch all vaults and their fields for this user
  const vaults = await db.vault.findMany({
    where: { userId: req.userId },
    include: { fields: true },
  });

  interface ReencryptedField {
    id: string;
    salt: string;
    iv: string;
    tag: string;
    data: string;
  }

  const reencryptedFields: ReencryptedField[] = [];

  for (const vault of vaults) {
    for (const field of vault.fields) {
      let plaintext: string;
      try {
        plaintext = decrypt(
          storedToPayload(payloadToStored({ salt: field.salt, iv: field.iv, tag: field.tag, data: field.data })),
          currentMasterKey
        );
      } catch {
        res.status(400).json({
          error: "Gagal mendekripsi data vault lama dengan master key saat ini.",
        });
        return;
      }
      const enc = encrypt(plaintext, newMasterKey);
      reencryptedFields.push({
        id: field.id,
        salt: enc.salt,
        iv: enc.iv,
        tag: enc.tag,
        data: enc.data,
      });
    }
  }

  // Compute new master key hash and login password hash
  const { salt: newMasterSalt, hash: newMasterHash } = hashMasterKey(newMasterKey);
  const { salt: newLoginSalt, hash: newLoginHash } = hashMasterKey(newMasterKey);

  await db.$transaction(async (tx) => {
    // 1. Update all re-encrypted fields
    for (const field of reencryptedFields) {
      await tx.vaultField.update({
        where: { id: field.id },
        data: {
          salt: field.salt,
          iv: field.iv,
          tag: field.tag,
          data: field.data,
        },
      });
    }

    // 2. Update user master key and password in DB
    await tx.user.update({
      where: { id: req.userId },
      data: {
        password: [newLoginSalt, newLoginHash].join("."),
        masterSalt: newMasterSalt,
        masterHash: newMasterHash,
      },
    });
  });

  // 3. Update session master key in memory
  const token = extractToken(req)!;
  setMasterKey(token, newMasterKey);

  res.json({ ok: true, message: "Master key berhasil diperbarui & seluruh data di-enkripsi ulang." });
});

authRouter.post("/lock", requireLogin, (req, res) => {
  const token = extractToken(req)!;
  unsetMasterKey(token);
  res.json({ ok: true });
});