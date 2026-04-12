import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const db = await createConnection(process.env.DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS flashcard_decks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(128) NOT NULL,
    userId INT,
    title VARCHAR(512) NOT NULL,
    description TEXT,
    sourceType ENUM('research','manual','ai_generated') NOT NULL DEFAULT 'ai_generated',
    sourceId INT,
    cardCount INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cookieId (cookieId)
  )`,
  `CREATE TABLE IF NOT EXISTS flashcards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deckId INT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    \`interval\` INT NOT NULL DEFAULT 1,
    easeFactor FLOAT NOT NULL DEFAULT 2.5,
    repetitions INT NOT NULL DEFAULT 0,
    dueDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_deckId (deckId),
    INDEX idx_dueDate (dueDate)
  )`,
  `CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cardId INT NOT NULL,
    deckId INT NOT NULL,
    cookieId VARCHAR(128) NOT NULL,
    rating ENUM('again','hard','good','easy') NOT NULL,
    reviewedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cardId (cardId),
    INDEX idx_cookieId (cookieId)
  )`,
  `CREATE TABLE IF NOT EXISTS ai_provider_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(128) NOT NULL UNIQUE,
    provider ENUM('gemini','perplexity','openai') NOT NULL DEFAULT 'gemini',
    apiKey VARCHAR(512),
    model VARCHAR(128),
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS mind_maps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(128) NOT NULL,
    userId INT,
    title VARCHAR(512) NOT NULL,
    rootTopic VARCHAR(256) NOT NULL,
    nodesJson JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cookieId (cookieId)
  )`,
  `CREATE TABLE IF NOT EXISTS library_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    url VARCHAR(1024) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(128) NOT NULL,
    tags JSON,
    difficulty ENUM('beginner','intermediate','advanced') DEFAULT 'intermediate',
    type ENUM('article','video','course','tool','paper','book','repo') DEFAULT 'article',
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    addedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_featured (featured)
  )`,
];

for (const sql of tables) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
  try {
    await db.execute(sql);
    console.log(`✓ ${tableName}`);
  } catch (err) {
    console.error(`✗ ${tableName}:`, err.message);
  }
}

await db.end();
console.log("\nMigration v2 complete.");
