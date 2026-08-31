import type { Request, Response } from "express";
import { db } from "../prisma/db";
import {
  decrypt,
  encrypt,
  payloadToStored,
  storedToPayload,
} from "../config/crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function entryId(req: Request): string | null {
  const id = req.params.id;
  return typeof id === "string" && UUID_RE.test(id) ? id : null;
}

async function listEntries(req: Request, res: Response) {
  const list = await db.vault.findMany({
    where: { userId: req.userId },
    select: { id: true, appsource: true, createdAt: true, updatedAt: true },
    orderBy: { appsource: "asc" },
  });
  res.json({ entries: list });
}

async function getEntry(req: Request, res: Response) {
  const masterKey = req.masterKey!;
  const id = entryId(req);
  if (!id) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  const vault = await db.vault.findFirst({
    where: { id, userId: req.userId },
  });
  if (!vault) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  const fields = await db.vaultField.findMany({
    where: { vaultId: vault.id },
  });

  const decrypted: Record<string, string> = {};
  let valid = true;
  for (const f of fields) {
    try {
      decrypted[f.fieldKey] = decrypt(
        storedToPayload(payloadToStored({ salt: f.salt, iv: f.iv, tag: f.tag, data: f.data })),
        masterKey
      );
    } catch {
      valid = false;
    }
  }
  if (!valid) {
    res.status(401).json({ error: "Failed to decrypt (wrong master key or corrupted data)." });
    return;
  }
  res.json({ id: vault.id, appsource: vault.appsource, ...decrypted, createdAt: vault.createdAt });
}

async function createEntry(req: Request, res: Response) {
  const masterKey = req.masterKey!;
  const userId = req.userId;
  const { appsource, username, password, notes } = req.body as Record<string, string>;
  if (!appsource || !username || !password) {
    res.status(400).json({ error: "appsource, username and password are required." });
    return;
  }

  const result = await db.$transaction(async (tx) => {
    const vault = await tx.vault.create({ data: { userId, appsource } });
    const toEncrypt: Array<[string, string]> = [
      ["username", username],
      ["password", password],
    ];
    if (notes !== undefined && notes !== "") toEncrypt.push(["notes", notes]);
    for (const [key, value] of toEncrypt) {
      const enc = encrypt(value, masterKey);
      await tx.vaultField.create({
        data: {
          vaultId: vault.id,
          fieldKey: key,
          salt: enc.salt,
          iv: enc.iv,
          tag: enc.tag,
          data: enc.data,
        },
      });
    }
    return vault;
  });

  res.status(201).json({ id: result.id, appsource, createdAt: result.createdAt });
}

async function updateEntry(req: Request, res: Response) {
  const masterKey = req.masterKey!;
  const userId = req.userId;
  const { appsource, username, password, notes } = req.body as Record<string, string>;
  const id = entryId(req);
  if (!id) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  const vault = await db.vault.findFirst({
    where: { id, userId },
  });
  if (!vault) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }

  await db.$transaction(async (tx) => {
    if (appsource !== undefined && appsource !== vault.appsource) {
      await tx.vault.update({
        where: { id: vault.id },
        data: { appsource },
      });
    }
    const writable: Array<[string, string]> = [];
    if (username !== undefined) writable.push(["username", username]);
    if (password !== undefined) writable.push(["password", password]);
    if (notes !== undefined) writable.push(["notes", notes]);
    for (const [key, value] of writable) {
      const enc = encrypt(value, masterKey);
      const existing = await tx.vaultField.findFirst({
        where: { vaultId: vault.id, fieldKey: key },
      });
      if (existing) {
        await tx.vaultField.update({
          where: { id: existing.id },
          data: { salt: enc.salt, iv: enc.iv, tag: enc.tag, data: enc.data },
        });
      } else {
        await tx.vaultField.create({
          data: {
            vaultId: vault.id,
            fieldKey: key,
            salt: enc.salt,
            iv: enc.iv,
            tag: enc.tag,
            data: enc.data,
          },
        });
      }
    }
  });

  res.json({ ok: true });
}

async function deleteEntry(req: Request, res: Response) {
  const id = entryId(req);
  if (!id) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  const vault = await db.vault.findFirst({
    where: { id, userId: req.userId },
  });
  if (!vault) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  await db.vault.delete({ where: { id: vault.id } });
  res.json({ ok: true });
}

export const entriesController = {
  list: listEntries,
  get: getEntry,
  create: createEntry,
  update: updateEntry,
  remove: deleteEntry,
};