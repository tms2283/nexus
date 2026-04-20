/**
 * migrate-v6.mjs - Adaptive lesson assessment + reflection persistence.
 *
 * Creates: lesson_assessment_responses, lesson_reflections
 * Mirrors drizzle/0014_known_clint_barton.sql so prod state matches the schema.
 *
 * Run: node scripts/migrate-v6.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);
console.log("[migrate-v6] Connected to database.");

const statements = [
  {
    name: "lesson_assessment_responses",
    sql: `CREATE TABLE IF NOT EXISTS lesson_assessment_responses (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      userId          INT,
      cookieId        VARCHAR(128) NOT NULL,
      lessonId        VARCHAR(64)  NOT NULL,
      itemId          VARCHAR(128) NOT NULL,
      itemKind        VARCHAR(32)  NOT NULL,
      correct         BOOLEAN,
      confidence      INT,
      responsePayload JSON,
      createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      INDEX lesson_assessment_cookie_lesson_idx (cookieId, lessonId),
      INDEX lesson_assessment_user_lesson_idx   (userId, lessonId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
  {
    name: "lesson_reflections",
    sql: `CREATE TABLE IF NOT EXISTS lesson_reflections (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      userId          INT,
      cookieId        VARCHAR(128) NOT NULL,
      lessonId        VARCHAR(64)  NOT NULL,
      itemId          VARCHAR(128) NOT NULL,
      prompt          TEXT NOT NULL,
      response        TEXT NOT NULL,
      rubricFeedback  JSON,
      createdAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      INDEX lesson_reflections_cookie_lesson_idx (cookieId, lessonId),
      INDEX lesson_reflections_user_lesson_idx   (userId, lessonId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  },
];

let failed = 0;
for (const { name, sql } of statements) {
  try {
    await db.execute(sql);
    console.log(`[migrate-v6] OK ${name}`);
  } catch (err) {
    console.error(`[migrate-v6] ${name}:`, err.message);
    failed += 1;
  }
}

await db.end();
console.log(`[migrate-v6] Done. Failures: ${failed}.`);
process.exitCode = failed > 0 ? 1 : 0;
