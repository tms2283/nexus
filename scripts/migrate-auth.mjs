// scripts/migrate-auth.mjs
// Adds auth columns to users table and creates user_psych_profiles

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await mysql.createConnection(DB_URL);

const run = async (sql, label) => {
  try {
    await conn.execute(sql);
    console.log(`[migrate-auth] ✓ ${label}`);
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME" || e.code === "ER_TABLE_EXISTS_ERROR" || e.message?.includes("Duplicate column")) {
      console.log(`[migrate-auth] ~ ${label} (already exists)`);
    } else {
      console.error(`[migrate-auth] ✗ ${label}:`, e.message);
    }
  }
};

// Alter users table
await run(`ALTER TABLE users MODIFY COLUMN openId VARCHAR(64) NULL`, "users.openId nullable");
await run(`ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255) NULL`, "users.passwordHash");
await run(`ALTER TABLE users ADD COLUMN googleId VARCHAR(128) NULL UNIQUE`, "users.googleId");
await run(`ALTER TABLE users ADD COLUMN facebookId VARCHAR(128) NULL UNIQUE`, "users.facebookId");
await run(`ALTER TABLE users ADD COLUMN avatarUrl TEXT NULL`, "users.avatarUrl");
await run(`ALTER TABLE users ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT FALSE`, "users.emailVerified");
await run(`ALTER TABLE users ADD COLUMN onboardingCompleted BOOLEAN NOT NULL DEFAULT FALSE`, "users.onboardingCompleted");
await run(`ALTER TABLE users MODIFY COLUMN email VARCHAR(320) NULL`, "users.email nullable");

// Try to add unique constraint on email (may fail if dupes exist)
await run(`ALTER TABLE users ADD UNIQUE INDEX users_email_unique (email)`, "users.email unique index");

// Create user_psych_profiles
await run(`
  CREATE TABLE IF NOT EXISTS user_psych_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL UNIQUE,
    quizAnswers JSON,
    inferredBackground VARCHAR(128),
    inferredInterests JSON,
    inferredGoal VARCHAR(255),
    inferredLearnStyle VARCHAR(128),
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`, "user_psych_profiles table");

// Add userId to content tables
const contentTables = [
  "chat_messages",
  "research_sessions",
  "flashcard_decks",
  "ai_provider_settings",
  "mind_maps",
  "test_results",
  "iq_results",
  "lessons",
  "lesson_progress",
  "curriculum_progress",
  "skill_mastery",
  "reading_list",
  "lesson_questions",
  "lesson_ratings",
];

for (const table of contentTables) {
  await run(
    `ALTER TABLE \`${table}\` ADD COLUMN userId INT NULL`,
    `${table}.userId`
  );
}

await conn.end();
console.log("[migrate-auth] Done.");
