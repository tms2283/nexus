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
CREATE TABLE `reading_list` (
	`id` int AUTO_INCREMENT NOT NULL,
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
CREATE TABLE `skill_mastery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cookieId` varchar(128) NOT NULL,
	`skillId` varchar(128) NOT NULL,
	`level` int NOT NULL DEFAULT 0,
	`evidenceCount` int NOT NULL DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skill_mastery_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_skill_mastery_cookieId_skillId` UNIQUE(`cookieId`,`skillId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `idx_users_email` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `idx_audio_overviews_sourceId_sourceType` ON `audio_overviews` (`sourceId`,`sourceType`);--> statement-breakpoint
CREATE INDEX `idx_audio_overviews_cookieId` ON `audio_overviews` (`cookieId`);--> statement-breakpoint
CREATE INDEX `idx_background_jobs_status` ON `background_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reading_list_cookieId_addedAt` ON `reading_list` (`cookieId`,`addedAt`);--> statement-breakpoint
CREATE INDEX `idx_research_projects_cookieId_createdAt` ON `research_projects` (`cookieId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_research_sources_cookieId` ON `research_sources` (`cookieId`);--> statement-breakpoint
CREATE INDEX `idx_research_sources_sessionId` ON `research_sources` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_cookieId_createdAt` ON `chat_messages` (`cookieId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_codex_entries_category` ON `codex_entries` (`category`);--> statement-breakpoint
CREATE INDEX `idx_course_modules_courseId_order` ON `course_modules` (`courseId`,`order`);--> statement-breakpoint
CREATE INDEX `idx_curriculum_progress_cookieId_curriculumId` ON `curriculum_progress` (`cookieId`,`curriculumId`);--> statement-breakpoint
CREATE INDEX `idx_flashcard_decks_cookieId_createdAt` ON `flashcard_decks` (`cookieId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_flashcard_decks_userId` ON `flashcard_decks` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_flashcard_reviews_deckId_cookieId` ON `flashcard_reviews` (`deckId`,`cookieId`);--> statement-breakpoint
CREATE INDEX `idx_flashcard_reviews_cardId` ON `flashcard_reviews` (`cardId`);--> statement-breakpoint
CREATE INDEX `idx_flashcards_deckId_dueDate` ON `flashcards` (`deckId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `idx_iq_results_cookieId_completedAt` ON `iq_results` (`cookieId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `idx_learning_progress_cookieId_courseId` ON `learning_progress` (`cookieId`,`courseId`);--> statement-breakpoint
CREATE INDEX `idx_lesson_answers_questionId` ON `lesson_answers` (`questionId`);--> statement-breakpoint
CREATE INDEX `idx_lesson_feedback_lessonId` ON `lesson_feedback` (`lessonId`);--> statement-breakpoint
CREATE INDEX `idx_lesson_progress_cookieId_lessonId` ON `lesson_progress` (`cookieId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `idx_lesson_progress_lessonId` ON `lesson_progress` (`lessonId`);--> statement-breakpoint
CREATE INDEX `idx_lesson_questions_lessonId_createdAt` ON `lesson_questions` (`lessonId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_lesson_ratings_lessonId_cookieId` ON `lesson_ratings` (`lessonId`,`cookieId`);--> statement-breakpoint
CREATE INDEX `idx_lessons_cookieId_curriculumId` ON `lessons` (`cookieId`,`curriculumId`);--> statement-breakpoint
CREATE INDEX `idx_lessons_userId` ON `lessons` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_lessons_isShared_viewCount` ON `lessons` (`isShared`,`viewCount`);--> statement-breakpoint
CREATE INDEX `idx_library_resources_category_featured` ON `library_resources` (`category`,`featured`);--> statement-breakpoint
CREATE INDEX `idx_mind_maps_cookieId_updatedAt` ON `mind_maps` (`cookieId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `idx_mind_maps_userId` ON `mind_maps` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_research_sessions_cookieId_createdAt` ON `research_sessions` (`cookieId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_test_questions_testId_sortOrder` ON `test_questions` (`testId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `idx_test_results_cookieId_completedAt` ON `test_results` (`cookieId`,`completedAt`);