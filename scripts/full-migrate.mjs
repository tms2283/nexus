import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);

const statements = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openId VARCHAR(64) NOT NULL UNIQUE,
    name TEXT,
    email VARCHAR(320),
    loginMethod VARCHAR(64),
    role ENUM('user','admin') DEFAULT 'user' NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,

  // Visitor profiles table
  `CREATE TABLE IF NOT EXISTS visitor_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(64) NOT NULL UNIQUE,
    visitCount INT DEFAULT 0,
    firstVisit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastVisit TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pagesVisited JSON,
    interests JSON,
    interactionCount INT DEFAULT 0,
    quizCompleted BOOLEAN DEFAULT FALSE,
    quizResults JSON,
    preferredTopics JSON,
    timeOnSite INT DEFAULT 0,
    aiInteractions INT DEFAULT 0,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    streak INT DEFAULT 0,
    lastStreakDate DATE,
    badges JSON,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Chat messages table
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cookieId VARCHAR(128) NOT NULL,
    role ENUM('user','assistant') NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,

  // Contact submissions table
  `CREATE TABLE IF NOT EXISTS contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(320) NOT NULL,
    subject VARCHAR(500),
    message TEXT NOT NULL,
    cookieId VARCHAR(64),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,

  // Codex entries table
  `CREATE TABLE IF NOT EXISTS codex_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(2048),
    category VARCHAR(100),
    tags JSON,
    difficulty ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    featured BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  // Courses table
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

  // Course modules table
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

  // Learning progress table
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

  // Research sessions table
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

let created = 0;
let skipped = 0;

for (const sql of statements) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`✓ Created/verified: ${tableName}`);
    created++;
  } catch (e) {
    console.error(`✗ Error with ${tableName}:`, e.message);
    skipped++;
  }
}

// Verify all tables exist
const [tables] = await conn.query("SHOW TABLES");
console.log(`\n✅ Tables in database: ${tables.length}`);
tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));

await conn.end();
console.log(`\nMigration complete. Created: ${created}, Errors: ${skipped}`);
