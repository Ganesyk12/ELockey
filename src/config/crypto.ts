import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export interface EncryptedPayload {
  salt: string;
  iv: string;
  tag: string;
  data: string;
}

const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT_LEN = 16;
const PBKDF2_ITERATIONS = 310_000;

const b64 = (b: Buffer) => b.toString("base64");
const unb64 = (s: string) => Buffer.from(s, "base64");

function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LEN);
}

export function encrypt(plain: string, masterKey: string): EncryptedPayload {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(masterKey, salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    salt: b64(salt),
    iv: b64(iv),
    tag: b64(tag),
    data: b64(encrypted),
  };
}

export function decrypt(payload: EncryptedPayload, masterKey: string): string {
  const salt = unb64(payload.salt);
  const iv = unb64(payload.iv);
  const tag = unb64(payload.tag);
  const data = unb64(payload.data);
  const key = deriveKey(masterKey, salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export interface MasterKeyHash {
  salt: string;
  hash: string;
}

export function hashMasterKey(masterKey: string): MasterKeyHash {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(masterKey, salt, 64);
  return { salt: b64(salt), hash: b64(hash) };
}

export function verifyMasterKey(masterKey: string, stored: MasterKeyHash): boolean {
  const salt = unb64(stored.salt);
  const expected = unb64(stored.hash);
  const actual = scryptSync(masterKey, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function storedToPayload(value: string): EncryptedPayload {
  const [salt, iv, tag, data] = value.split(".");
  if (!salt || !iv || !tag || !data) {
    throw new Error("Invalid stored payload format");
  }
  return { salt, iv, tag, data };
}

export function payloadToStored(p: EncryptedPayload): string {
  return [p.salt, p.iv, p.tag, p.data].join(".");
}
