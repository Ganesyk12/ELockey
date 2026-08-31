import type { Request, Response } from "express";
import { db } from "../prisma/db";
import {
  decrypt,
  encrypt,
  payloadToStored,
  storedToPayload,
} from "../config/crypto";

async function listEntries(req: Request, res: Response) {
  const list = await db.orm.public.Vault.where((v) => v.userId.eq(req.userId))
    .select("id", "appsource", "createdAt", "updatedAt")
    .orderBy((v) => v.appsource.asc())
    .all();
  res.json({ entries: list });
}

async function getEntry(req: Request, res: Response) {
  const masterKey = req.masterKey!;
  const vault = await db.orm.public.Vault.where((v) => v.id.eq(req.params.id as never))
    .where((v) => v.userId.eq(req.userId))
    .first();
  if (!vault) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  const fields = await db.orm.public.VaultField.where((vf) =>
    vf.vaultId.eq(vault.id)
  ).all();

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

  const result = await db.transaction(async (tx) => {
    const vault = await tx.orm.public.Vault.create({ userId, appsource });
    const toEncrypt: Array<[string, string]> = [
      ["username", username],
      ["password", password],
    ];
    if (notes !== undefined && notes !== "") toEncrypt.push(["notes", notes]);
    for (const [key, value] of toEncrypt) {
      const enc = encrypt(value, masterKey);
      await tx.orm.public.VaultField.create({
        vaultId: vault.id,
        fieldKey: key,
        salt: enc.salt,
        iv: enc.iv,
        tag: enc.tag,
        data: enc.data,
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
  const vault = await db.orm.public.Vault.where((v) => v.id.eq(req.params.id as never))
    .where((v) => v.userId.eq(userId))
    .first();
  if (!vault) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }

  await db.transaction(async (tx) => {
    if (appsource !== undefined && appsource !== vault.appsource) {
      await tx.orm.public.Vault.where({ id: vault.id }).update({ appsource });
    }
    const writable: Array<[string, string]> = [];
    if (username !== undefined) writable.push(["username", username]);
    if (password !== undefined) writable.push(["password", password]);
    if (notes !== undefined) writable.push(["notes", notes]);
    for (const [key, value] of writable) {
      const enc = encrypt(value, masterKey);
      const existing = await tx.orm.public.VaultField.where((vf) =>
        vf.vaultId.eq(vault.id)
      )
        .where((vf) => vf.fieldKey.eq(key))
        .first();
      if (existing) {
        await tx.orm.public.VaultField.where({ id: existing.id }).update({
          salt: enc.salt,
          iv: enc.iv,
          tag: enc.tag,
          data: enc.data,
        });
      } else {
        await tx.orm.public.VaultField.create({
          vaultId: vault.id,
          fieldKey: key,
          salt: enc.salt,
          iv: enc.iv,
          tag: enc.tag,
          data: enc.data,
        });
      }
    }
  });

  res.json({ ok: true });
}

async function deleteEntry(req: Request, res: Response) {
  const vault = await db.orm.public.Vault.where((v) => v.id.eq(req.params.id as never))
    .where((v) => v.userId.eq(req.userId))
    .first();
  if (!vault) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  await db.orm.public.Vault.where({ id: vault.id }).delete();
  res.json({ ok: true });
}

export const entriesController = {
  list: listEntries,
  get: getEntry,
  create: createEntry,
  update: updateEntry,
  remove: deleteEntry,
};
