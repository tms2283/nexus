/**
 * crypto.ts — AES-256-GCM encryption for sensitive stored values (user API keys).
 *
 * Key MUST be set via ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Generate: openssl rand -hex 32
 *
 * Encrypted format: "<iv_hex>:<tag_hex>:<ciphertext_hex>"
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LEN = 12; // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (hex.length === 64) return Buffer.from(hex, "hex");

  // No fallback — fail loudly so misconfigured deployments are caught immediately.
  // validateEnv() at startup will have already exited before we reach this, but
  // guard here too in case crypto is called in tests or scripts without the full
  // server startup path.
  throw new Error(
    "ENCRYPTION_KEY environment variable is required but not set or is invalid. " +
    "Generate one with: openssl rand -hex 32"
  );
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
    if (parts.length !== 3) return encrypted; // not encrypted — return as-is (legacy plaintext)
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
