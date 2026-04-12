import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS test_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    testId VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    question TEXT NOT NULL,
    options JSON NOT NULL,
    correctAnswer INT NOT NULL,
    explanation TEXT,
    difficulty ENUM('easy','medium','hard') DEFAULT 'medium' NOT NULL,
    questionType VARCHAR(32) DEFAULT 'multiple-choice' NOT NULL,
    imageData TEXT,
    sortOrder INT DEFAULT 0 NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS test_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(128) NOT NULL,
    testId VARCHAR(64) NOT NULL,
    score INT NOT NULL,
    totalQuestions INT NOT NULL,
    answers JSON NOT NULL,
    timeTakenSeconds INT,
    completedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS iq_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(128) NOT NULL,
    iqScore INT NOT NULL,
    percentile INT NOT NULL,
    rawScore INT NOT NULL,
    categoryScores JSON NOT NULL,
    timeTakenSeconds INT,
    completedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
];

for (const sql of tables) {
  const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
  try {
    await conn.execute(sql);
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
  }
}

await conn.end();
console.log("Migration v3 complete.");
