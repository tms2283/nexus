CREATE TABLE `lesson_assessment_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`lessonId` varchar(64) NOT NULL,
	`itemId` varchar(128) NOT NULL,
	`itemKind` varchar(32) NOT NULL,
	`correct` boolean,
	`confidence` int,
	`responsePayload` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_assessment_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lesson_reflections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`cookieId` varchar(128) NOT NULL,
	`lessonId` varchar(64) NOT NULL,
	`itemId` varchar(128) NOT NULL,
	`prompt` text NOT NULL,
	`response` text NOT NULL,
	`rubricFeedback` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lesson_reflections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `lesson_assessment_cookie_lesson_idx` ON `lesson_assessment_responses` (`cookieId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `lesson_assessment_user_lesson_idx` ON `lesson_assessment_responses` (`userId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `lesson_reflections_cookie_lesson_idx` ON `lesson_reflections` (`cookieId`,`lessonId`);--> statement-breakpoint
CREATE INDEX `lesson_reflections_user_lesson_idx` ON `lesson_reflections` (`userId`,`lessonId`);
