CREATE TABLE `adaptive_lesson_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`lessonKey` varchar(128) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`timeSpentSeconds` int NOT NULL DEFAULT 0,
	`attempts` int NOT NULL DEFAULT 1,
	`lastAccessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adaptive_lesson_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adaptive_lesson_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lessonKey` varchar(128) NOT NULL,
	`conceptId` varchar(96) NOT NULL,
	`profileBucket` varchar(64) NOT NULL,
	`templateJson` json NOT NULL,
	`generatorModel` varchar(64),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adaptive_lesson_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `adaptive_lesson_templates_lessonKey_unique` UNIQUE(`lessonKey`)
);
--> statement-breakpoint
CREATE TABLE `concept_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conceptId` varchar(96) NOT NULL,
	`assetId` int NOT NULL,
	`role` enum('primary','practice','deep-dive','alternate') NOT NULL DEFAULT 'primary',
	`relevanceScore` float DEFAULT 0.5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `concept_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concept_mastery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`conceptId` varchar(96) NOT NULL,
	`pKnown` float NOT NULL DEFAULT 0.1,
	`attemptCount` int NOT NULL DEFAULT 0,
	`correctCount` int NOT NULL DEFAULT 0,
	`masteredAt` timestamp,
	`lastAttemptAt` timestamp,
	`lastCorrect` boolean,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `concept_mastery_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concept_prerequisites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conceptId` varchar(96) NOT NULL,
	`prerequisiteId` varchar(96) NOT NULL,
	`strength` enum('hard','soft') NOT NULL DEFAULT 'hard',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `concept_prerequisites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` varchar(96) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` text NOT NULL,
	`domain` varchar(64) NOT NULL,
	`bloomLevel` enum('remember','understand','apply','analyze','evaluate','create') NOT NULL,
	`estimatedMinutes` int NOT NULL DEFAULT 15,
	`misconceptions` json,
	`vocabKeys` json,
	`source` enum('seeded','llm-extracted','admin-authored') NOT NULL DEFAULT 'llm-extracted',
	`reviewStatus` enum('draft','published','deprecated') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `concepts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goal_path_nodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pathId` varchar(64) NOT NULL,
	`conceptId` varchar(96) NOT NULL,
	`sequenceNumber` int NOT NULL,
	`lessonKey` varchar(128),
	`lessonStatus` enum('queued','generating','ready','failed') NOT NULL DEFAULT 'queued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goal_path_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goal_paths` (
	`id` varchar(64) NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`goalText` varchar(1000) NOT NULL,
	`goalSummary` varchar(255),
	`pitch` text,
	`estimatedTotalMinutes` int NOT NULL DEFAULT 0,
	`status` enum('building','ready','in_progress','completed','abandoned') NOT NULL DEFAULT 'building',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goal_paths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`sourcePlatform` varchar(128) NOT NULL,
	`contentType` enum('textbook','article','video','simulation','interactive','problem-set','lecture','other') NOT NULL,
	`licenseName` varchar(128) NOT NULL,
	`licenseUrl` varchar(1024),
	`licenseCategory` enum('commercial_ok','nc_only','deep_link_only') NOT NULL,
	`difficultyLevel` enum('intro','core','stretch') NOT NULL DEFAULT 'core',
	`estimatedMinutes` int NOT NULL DEFAULT 15,
	`hasAssessment` boolean NOT NULL DEFAULT false,
	`visualTags` json,
	`priority` int NOT NULL DEFAULT 3,
	`embeddable` boolean,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learning_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `adaptive_progress_cookie_lesson_idx` ON `adaptive_lesson_progress` (`cookieId`,`lessonKey`);--> statement-breakpoint
CREATE INDEX `adaptive_templates_concept_bucket_idx` ON `adaptive_lesson_templates` (`conceptId`,`profileBucket`);--> statement-breakpoint
CREATE INDEX `concept_assets_concept_idx` ON `concept_assets` (`conceptId`);--> statement-breakpoint
CREATE INDEX `concept_assets_asset_idx` ON `concept_assets` (`assetId`);--> statement-breakpoint
CREATE INDEX `concept_mastery_cookie_concept_idx` ON `concept_mastery` (`cookieId`,`conceptId`);--> statement-breakpoint
CREATE INDEX `concept_mastery_user_concept_idx` ON `concept_mastery` (`userId`,`conceptId`);--> statement-breakpoint
CREATE INDEX `concept_prereq_concept_idx` ON `concept_prerequisites` (`conceptId`);--> statement-breakpoint
CREATE INDEX `concept_prereq_prereq_idx` ON `concept_prerequisites` (`prerequisiteId`);--> statement-breakpoint
CREATE INDEX `concept_prereq_pair_idx` ON `concept_prerequisites` (`conceptId`,`prerequisiteId`);--> statement-breakpoint
CREATE INDEX `concepts_domain_idx` ON `concepts` (`domain`);--> statement-breakpoint
CREATE INDEX `concepts_status_idx` ON `concepts` (`reviewStatus`);--> statement-breakpoint
CREATE INDEX `goal_path_nodes_path_seq_idx` ON `goal_path_nodes` (`pathId`,`sequenceNumber`);--> statement-breakpoint
CREATE INDEX `goal_path_nodes_path_idx` ON `goal_path_nodes` (`pathId`);--> statement-breakpoint
CREATE INDEX `goal_path_nodes_concept_idx` ON `goal_path_nodes` (`conceptId`);--> statement-breakpoint
CREATE INDEX `goal_paths_cookie_idx` ON `goal_paths` (`cookieId`);--> statement-breakpoint
CREATE INDEX `goal_paths_user_idx` ON `goal_paths` (`userId`);--> statement-breakpoint
CREATE INDEX `goal_paths_status_idx` ON `goal_paths` (`status`);--> statement-breakpoint
CREATE INDEX `learning_assets_platform_idx` ON `learning_assets` (`sourcePlatform`);--> statement-breakpoint
CREATE INDEX `learning_assets_license_idx` ON `learning_assets` (`licenseCategory`);--> statement-breakpoint
CREATE INDEX `learning_assets_priority_idx` ON `learning_assets` (`priority`);