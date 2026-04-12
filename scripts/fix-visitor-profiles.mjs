import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Check existing columns
const [cols] = await conn.query("DESCRIBE visitor_profiles");
const existingCols = cols.map(c => c.Field);
console.log("Existing columns:", existingCols);

// Columns that the schema expects
const requiredAlters = [
  { col: "interests", sql: "ADD COLUMN interests JSON" },
  { col: "interactionCount", sql: "ADD COLUMN interactionCount INT DEFAULT 0" },
  { col: "quizResults", sql: "ADD COLUMN quizResults JSON" },
  { col: "preferredTopics", sql: "ADD COLUMN preferredTopics JSON" },
  { col: "timeOnSite", sql: "ADD COLUMN timeOnSite INT DEFAULT 0" },
  { col: "aiInteractions", sql: "ADD COLUMN aiInteractions INT DEFAULT 0" },
  { col: "xp", sql: "ADD COLUMN xp INT DEFAULT 0" },
  { col: "level", sql: "ADD COLUMN level INT DEFAULT 1" },
  { col: "streak", sql: "ADD COLUMN streak INT DEFAULT 0" },
  { col: "lastStreakDate", sql: "ADD COLUMN lastStreakDate DATE" },
  { col: "badges", sql: "ADD COLUMN badges JSON" },
  { col: "updatedAt", sql: "ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" },
];

for (const alter of requiredAlters) {
  if (!existingCols.includes(alter.col)) {
    try {
      await conn.execute(`ALTER TABLE visitor_profiles ${alter.sql}`);
      console.log(`✓ Added column: ${alter.col}`);
    } catch (e) {
      console.error(`✗ Error adding ${alter.col}:`, e.message);
    }
  } else {
    console.log(`- Column already exists: ${alter.col}`);
  }
}

// Also check chat_messages table
const [chatCols] = await conn.query("DESCRIBE chat_messages");
const chatColNames = chatCols.map(c => c.Field);
console.log("\nChat messages columns:", chatColNames);

// Check codex_entries table
const [codexCols] = await conn.query("DESCRIBE codex_entries");
const codexColNames = codexCols.map(c => c.Field);
console.log("Codex entries columns:", codexColNames);

await conn.end();
console.log("\nMigration complete.");
