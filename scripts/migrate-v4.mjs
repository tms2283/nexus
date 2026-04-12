/**
 * migrate-v4.mjs — Add new Nexus v2 tables.
 *
 * Creates: research_sources, research_projects, audio_overviews,
 *          skill_mastery, background_jobs, reading_list
 *
 * Run: node scripts/migrate-v4.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const db = await mysql.createConnection(process.env.DATABASE_URL);
console.log("[migrate-v4] Connected to database.");

const tables = [
  `CREATE TABLE IF NOT EXISTS research_sources (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cookieId    VARCHAR(128) NOT NULL,
    sessionId   INT,
    url         VARCHAR(2000) NOT NULL,
    title       VARCHAR(512) NOT NULL,
    author      VARCHAR(256),
    publishDate VARCHAR(64),
    fullText    LONGTEXT,
    shortSummary    TEXT,
    detailedSummary LONGTEXT,
    keyPoints   JSON,
    topics      JSON,
    score       FLOAT DEFAULT 0.5,
    faissId     INT,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rs_cookie (cookieId),
    UNIQUE KEY idx_rs_url_cookie (url(512), cookieId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS research_projects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cookieId    VARCHAR(128) NOT NULL,
    sessionId   INT,
    name        VARCHAR(256) NOT NULL,
    topic       VARCHAR(512),
    sourceCount INT DEFAULT 0 NOT NULL,
    audioUrl    VARCHAR(1024),
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rp_cookie (cookieId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS audio_overviews (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    cookieId       VARCHAR(128) NOT NULL,
    sourceType     ENUM('research_session','lesson') NOT NULL,
    sourceId       INT NOT NULL,
    audioUrl       VARCHAR(1024) NOT NULL,
    transcript     LONGTEXT,
    durationSeconds INT,
    createdAt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ao_cookie (cookieId),
    INDEX idx_ao_source (sourceType, sourceId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS skill_mastery (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    cookieId      VARCHAR(128) NOT NULL,
    skillId       VARCHAR(128) NOT NULL,
    level         INT DEFAULT 0 NOT NULL,
    evidenceCount INT DEFAULT 0 NOT NULL,
    lastUpdated   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_sm_unique (cookieId, skillId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS background_jobs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    type        VARCHAR(128) NOT NULL,
    payload     JSON,
    status      ENUM('pending','processing','done','failed') DEFAULT 'pending' NOT NULL,
    attempts    INT DEFAULT 0 NOT NULL,
    error       TEXT,
    createdAt   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processedAt TIMESTAMP NULL,
    INDEX idx_bj_status (status),
    INDEX idx_bj_type (type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS reading_list (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cookieId    VARCHAR(128) NOT NULL,
    resourceId  INT,
    url         VARCHAR(2000),
    title       VARCHAR(512) NOT NULL,
    description TEXT,
    category    VARCHAR(128),
    status      ENUM('want','reading','finished') DEFAULT 'want' NOT NULL,
    isRead      BOOLEAN DEFAULT FALSE NOT NULL,
    addedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rl_cookie (cookieId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Add status column to reading_list if it doesn't exist (idempotent)
try {
  await db.execute(`ALTER TABLE reading_list ADD COLUMN status ENUM('want','reading','finished') DEFAULT 'want' NOT NULL AFTER category`);
  console.log("[migrate-v4] ✓ reading_list.status column added");
} catch (err) {
  if (err.code !== 'ER_DUP_FIELDNAME') console.warn("[migrate-v4] reading_list.status:", err.message);
}

for (const sql of tables) {  const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] ?? "unknown";
  try {
    await db.execute(sql);
    console.log(`[migrate-v4] ✓ ${name}`);
  } catch (err) {
    console.error(`[migrate-v4] ✗ ${name}:`, err.message);
  }
}

await db.end();
console.log("[migrate-v4] Done.");
