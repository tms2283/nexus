CREATE TABLE `audio_overviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cookieId` varchar(128) NOT NULL,
	`sourceType` enum('research_session','lesson') NOT NULL,
	`sourceId` int NOT NULL,
	`audioUrl` varchar(1024) NOT NULL,
	`transcript` text,
	`durationSeconds` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audio_overviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `background_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(128) NOT NULL,
	`payload` json,
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `background_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_blueprints` (
	`id` varchar(64) NOT NULL,
	`lessonId` int NOT NULL,
	`blueprintJson` json NOT NULL,
	`totalEstimatedMinutes` int,
	`heroImagePrompt` text,
	`videoConceptPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_blueprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_sections` (
	`id` varchar(64) NOT NULL,
	`lessonId` int NOT NULL,
	`sequenceNumber` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text NOT NULL,
	`svgContent` text,
	`imageUrl` text,
	`videoUrl` text,
	`audioUrl` text,
	`retrievalQuestion` text,
	`questionType` varchar(32),
	`questionOptions` json,
	`correctAnswer` text,
	`visualAsset` varchar(32),
	`learningPrinciple` varchar(64),
	`imageGeneratedAt` timestamp,
	`videoGeneratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reading_list` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`resourceId` int,
	`url` varchar(2000),
	`title` varchar(512) NOT NULL,
	`description` text,
	`category` varchar(128),
	`status` enum('want','reading','finished') NOT NULL DEFAULT 'want',
	`isRead` boolean NOT NULL DEFAULT false,
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reading_list_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cookieId` varchar(128) NOT NULL,
	`sessionId` int,
	`name` varchar(256) NOT NULL,
	`topic` varchar(512),
	`sourceCount` int NOT NULL DEFAULT 0,
	`audioUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cookieId` varchar(128) NOT NULL,
	`sessionId` int,
	`url` varchar(2000) NOT NULL,
	`title` varchar(512) NOT NULL,
	`author` varchar(256),
	`publishDate` varchar(64),
	`fullText` text,
	`shortSummary` text,
	`detailedSummary` text,
	`keyPoints` json,
	`topics` json,
	`score` float DEFAULT 0.5,
	`faissId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `section_completions` (
	`id` varchar(64) NOT NULL,
	`lessonId` int NOT NULL,
	`sectionId` varchar(64) NOT NULL,
	`cookieId` varchar(128) NOT NULL,
	`retrievalAnswer` text,
	`answerCorrect` boolean,
	`timeSpentSeconds` int,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `section_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skill_mastery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`skillId` varchar(128) NOT NULL,
	`level` int NOT NULL DEFAULT 0,
	`evidenceCount` int NOT NULL DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skill_mastery_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_psych_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`quizAnswers` json,
	`inferredBackground` varchar(128),
	`inferredInterests` json,
	`inferredGoal` varchar(255),
	`inferredLearnStyle` varchar(128),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_psych_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_psych_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` MODIFY COLUMN `cookieId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `ai_provider_settings` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `iq_results` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `research_sessions` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `test_results` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `googleId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `facebookId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingCompleted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_googleId_unique` UNIQUE(`googleId`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_facebookId_unique` UNIQUE(`facebookId`);--> statement-breakpoint
CREATE INDEX `lesson_blueprints_lessonId_idx` ON `lesson_blueprints` (`lessonId`);--> statement-breakpoint
CREATE INDEX `lesson_sections_lesson_seq_idx` ON `lesson_sections` (`lessonId`,`sequenceNumber`);--> statement-breakpoint
CREATE INDEX `lesson_sections_lessonId_idx` ON `lesson_sections` (`lessonId`);--> statement-breakpoint
CREATE INDEX `section_completions_cookie_lesson_idx` ON `section_completions` (`cookieId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `section_completions_section_idx` ON `section_completions` (`sectionId`);--> statement-breakpoint
CREATE INDEX `chat_messages_cookieId_idx` ON `chat_messages` (`cookieId`);--> statement-breakpoint
CREATE INDEX `chat_messages_createdAt_idx` ON `chat_messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `curriculum_progress_cookie_curriculum_idx` ON `curriculum_progress` (`cookieId`,`curriculumId`);--> statement-breakpoint
CREATE INDEX `flashcard_decks_cookieId_idx` ON `flashcard_decks` (`cookieId`);--> statement-breakpoint
CREATE INDEX `flashcard_reviews_deckId_idx` ON `flashcard_reviews` (`deckId`);--> statement-breakpoint
CREATE INDEX `flashcard_reviews_cookieId_idx` ON `flashcard_reviews` (`cookieId`);--> statement-breakpoint
CREATE INDEX `flashcards_deckId_idx` ON `flashcards` (`deckId`);--> statement-breakpoint
CREATE INDEX `flashcards_dueDate_idx` ON `flashcards` (`dueDate`);--> statement-breakpoint
CREATE INDEX `flashcards_deckId_dueDate_idx` ON `flashcards` (`deckId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `iq_results_cookieId_idx` ON `iq_results` (`cookieId`);--> statement-breakpoint
CREATE INDEX `lesson_progress_cookie_lesson_idx` ON `lesson_progress` (`cookieId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `lesson_progress_cookieId_idx` ON `lesson_progress` (`cookieId`);--> statement-breakpoint
CREATE INDEX `lessons_cookieId_idx` ON `lessons` (`cookieId`);--> statement-breakpoint
CREATE INDEX `lessons_curriculumId_idx` ON `lessons` (`curriculumId`);--> statement-breakpoint
CREATE INDEX `lessons_isShared_idx` ON `lessons` (`isShared`);--> statement-breakpoint
CREATE INDEX `mind_maps_cookieId_idx` ON `mind_maps` (`cookieId`);--> statement-breakpoint
CREATE INDEX `research_sessions_cookieId_idx` ON `research_sessions` (`cookieId`);--> statement-breakpoint
CREATE INDEX `test_results_cookieId_idx` ON `test_results` (`cookieId`);--> statement-breakpoint
CREATE INDEX `test_results_testId_idx` ON `test_results` (`testId`);