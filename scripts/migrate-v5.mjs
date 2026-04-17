/**
 * migrate-v5.mjs - Add psych profile analyzer signal storage.
 *
 * Creates: psych_profile_signals
 *
 * Run: node scripts/migrate-v5.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);
console.log("[migrate-v5] Connected to database.");

const sql = `CREATE TABLE IF NOT EXISTS psych_profile_signals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  userId      INT NOT NULL,
  source      VARCHAR(64) NOT NULL,
  signalType  VARCHAR(64) NOT NULL,
  path        VARCHAR(512),
  topic       VARCHAR(255),
  metrics     JSON,
  createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pps_user (userId),
  INDEX idx_pps_source (source, signalType),
  INDEX idx_pps_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

try {
  await db.execute(sql);
  console.log("[migrate-v5] OK psych_profile_signals");
} catch (err) {
  console.error("[migrate-v5] psych_profile_signals:", err.message);
  process.exitCode = 1;
}

await db.end();
console.log("[migrate-v5] Done.");
