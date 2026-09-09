import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { config } from "../config";

const KEY = Buffer.from(config.dataEncryptionKey.padEnd(32, "0").slice(0, 32), "utf8");
const ALGO = "aes-256-gcm";

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export function maskSecret(plain: string, visible = 4): string {
  if (!plain) return "";
  if (plain.length <= visible) return "*".repeat(plain.length);
  return `${"*".repeat(plain.length - visible)}${plain.slice(-visible)}`;
}