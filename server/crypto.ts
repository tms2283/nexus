/**
 * crypto.ts — AES-256-GCM encryption for sensitive stored values (user API keys).
 *
 * Key is derived from ENCRYPTION_KEY env var (32 hex bytes = 64 hex chars).
 * Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Encrypted format: "<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length === 64) return Buffer.from(hex, "hex");
  // Fallback: derive a deterministic key from JWT_SECRET so existing deployments
  // don't break immediately — but log a warning.
  const secret = process.env.JWT_SECRET ?? "nexus-default-insecure-key";
  console.warn("[crypto] ENCRYPTION_KEY not set — API keys are stored with weak fallback encryption. Set ENCRYPTION_KEY in .env.");
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decrypt(encrypted: string): string {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 3) return encrypted; // not encrypted — return as-is (legacy)
    const [ivHex, tagHex, ciphertextHex] = parts;
    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(ciphertextHex, "hex")).toString("utf8") + decipher.final("utf8");
  } catch {
    // Decryption failed — value may be a legacy plaintext key
    return encrypted;
  }
}

/** Returns true if the string looks like an encrypted value we produced */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === IV_LEN * 2;
}
