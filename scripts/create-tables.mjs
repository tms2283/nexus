import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

const tables = [
  [`courses`, `CREATE TABLE IF NOT EXISTS \`courses\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`slug\` varchar(128) NOT NULL,
    \`title\` varchar(512) NOT NULL,
    \`description\` text NOT NULL,
    \`longDescription\` text,
    \`category\` varchar(128) NOT NULL,
    \`level\` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
    \`tags\` json,
    \`estimatedHours\` float DEFAULT 2,
    \`xpReward\` int NOT NULL DEFAULT 100,
    \`featured\` boolean NOT NULL DEFAULT false,
    \`published\` boolean NOT NULL DEFAULT true,
    \`prerequisites\` json,
    \`learningOutcomes\` json,
    \`instructor\` varchar(256) DEFAULT 'AI Curriculum',
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`courses_id\` PRIMARY KEY(\`id\`),
    UNIQUE KEY \`courses_slug\` (\`slug\`)
  )`],
  [`course_modules`, `CREATE TABLE IF NOT EXISTS \`course_modules\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`courseId\` int NOT NULL,
    \`title\` varchar(512) NOT NULL,
    \`content\` text NOT NULL,
    \`order\` int NOT NULL,
    \`type\` enum('lesson','quiz','lab','video') NOT NULL DEFAULT 'lesson',
    \`xpReward\` int NOT NULL DEFAULT 20,
    \`estimatedMinutes\` int DEFAULT 15,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`course_modules_id\` PRIMARY KEY(\`id\`)
  )`],
  [`learning_progress`, `CREATE TABLE IF NOT EXISTS \`learning_progress\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`cookieId\` varchar(128) NOT NULL,
    \`courseId\` int NOT NULL,
    \`moduleId\` int,
    \`status\` enum('started','in_progress','completed') NOT NULL DEFAULT 'started',
    \`progressPercent\` int NOT NULL DEFAULT 0,
    \`completedModules\` json,
    \`lastAccessedAt\` timestamp NOT NULL DEFAULT (now()),
    \`completedAt\` timestamp,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`learning_progress_id\` PRIMARY KEY(\`id\`)
  )`],
  [`research_sessions`, `CREATE TABLE IF NOT EXISTS \`research_sessions\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`cookieId\` varchar(128) NOT NULL,
    \`title\` varchar(512) NOT NULL,
    \`sourceText\` mediumtext,
    \`sourceUrl\` varchar(1024),
    \`summary\` text,
    \`keyInsights\` json,
    \`notes\` text,
    \`tags\` json,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`research_sessions_id\` PRIMARY KEY(\`id\`)
  )`],
];

for (const [name, sql] of tables) {
  try {
    await conn.execute(sql);
    console.log('✓ Created:', name);
  } catch(e) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('~ Already exists:', name);
    } else {
      console.error('✗ Error on', name, ':', e.message);
    }
  }
}
await conn.end();
console.log('Migration complete.');
