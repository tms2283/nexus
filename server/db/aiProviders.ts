/**
 * db/aiProviders.ts — User AI provider settings (encrypted key storage).
 */
import { eq } from 'drizzle-orm';
import { getDb } from './connection';
import { encrypt, decrypt } from '../crypto';
import { aiProviderSettings, type AIProviderSettings } from '../../drizzle/schema';

export async function getAIProviderSettings(cookieId: string): Promise<AIProviderSettings | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(aiProviderSettings)
    .where(eq(aiProviderSettings.cookieId, cookieId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  // Decrypt API key before returning — decrypt() handles legacy plaintext gracefully
  if (row.apiKey) row.apiKey = decrypt(row.apiKey);
  return row;
}

export async function upsertAIProviderSettings(
  cookieId: string,
  data: { provider: 'gemini' | 'perplexity' | 'openai'; apiKey?: string; model?: string },
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const encryptedKey = data.apiKey ? encrypt(data.apiKey) : null;
  await db.insert(aiProviderSettings)
    .values({ cookieId, provider: data.provider, apiKey: encryptedKey, model: data.model ?? null })
    .onDuplicateKeyUpdate({
      set: { provider: data.provider, apiKey: encryptedKey, model: data.model ?? null, updatedAt: new Date() },
    });
}
