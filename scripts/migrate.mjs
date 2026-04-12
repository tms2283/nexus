import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    level ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    estimatedWeeks INT DEFAULT 4,
    tags JSON,
    featured BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS course_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    courseId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    orderIndex INT DEFAULT 0,
    type ENUM('lesson','practice','project','assessment') DEFAULT 'lesson',
    durationMinutes INT DEFAULT 30,
    content TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS learning_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(64) NOT NULL,
    courseId INT,
    moduleId INT,
    status ENUM('started','completed') DEFAULT 'started',
    score INT,
    completedAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS research_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(64) NOT NULL,
    title VARCHAR(255),
    sourceText TEXT,
    sourceUrl VARCHAR(2048),
    summary TEXT,
    keyInsights JSON,
    flashcards JSON,
    notes TEXT,
    tags JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log("✓ Created/verified table");
  } catch (e) {
    console.error("✗ Error:", e.message);
  }
}

await conn.end();
console.log("Migration complete.");
