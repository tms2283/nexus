CREATE TABLE `role_assignments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `role` enum('owner','admin','editor','analyst','support') NOT NULL,
  `assignedByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `role_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `role_assignments_user_role_idx` ON `role_assignments` (`userId`,`role`);
--> statement-breakpoint

CREATE TABLE `audit_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `actorUserId` int,
  `action` varchar(128) NOT NULL,
  `resourceType` varchar(128) NOT NULL,
  `resourceId` varchar(128),
  `beforeJson` json,
  `afterJson` json,
  `ipAddress` varchar(64),
  `userAgent` varchar(512),
  `clientType` enum('web-admin','desktop-studio','system') NOT NULL DEFAULT 'web-admin',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actorUserId`);
--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);
--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `audit_logs` (`resourceType`,`resourceId`);
--> statement-breakpoint
CREATE INDEX `audit_logs_createdAt_idx` ON `audit_logs` (`createdAt`);
--> statement-breakpoint

CREATE TABLE `pages` (
  `id` int AUTO_INCREMENT NOT NULL,
  `slug` varchar(128) NOT NULL,
  `title` varchar(512) NOT NULL,
  `status` enum('draft','staged','published','archived') NOT NULL DEFAULT 'draft',
  `currentRevisionId` int,
  `publishedRevisionId` int,
  `createdBy` int,
  `updatedBy` int,
  `publishedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pages_id` PRIMARY KEY(`id`),
  CONSTRAINT `pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `pages_status_idx` ON `pages` (`status`);
--> statement-breakpoint

CREATE TABLE `page_variants` (
  `id` int AUTO_INCREMENT NOT NULL,
  `pageId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` enum('candidate','rejected','archived','published') NOT NULL DEFAULT 'candidate',
  `hypothesis` text,
  `commentary` text,
  `createdBy` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `page_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `page_variants_page_status_idx` ON `page_variants` (`pageId`,`status`);
--> statement-breakpoint

CREATE TABLE `page_sections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `pageId` int NOT NULL,
  `variantId` int,
  `type` varchar(64) NOT NULL,
  `position` int NOT NULL,
  `contentJson` json NOT NULL,
  `settingsJson` json,
  `isVisible` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `page_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `page_sections_page_pos_idx` ON `page_sections` (`pageId`,`position`);
--> statement-breakpoint
CREATE INDEX `page_sections_variant_pos_idx` ON `page_sections` (`variantId`,`position`);
--> statement-breakpoint

CREATE TABLE `page_revisions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `pageId` int NOT NULL,
  `variantId` int,
  `snapshotJson` json NOT NULL,
  `createdBy` int,
  `revisionLabel` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `page_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `page_revisions_page_created_idx` ON `page_revisions` (`pageId`,`createdAt`);
--> statement-breakpoint

CREATE TABLE `ai_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `requestId` varchar(64) NOT NULL,
  `userId` int,
  `feature` varchar(128) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `model` varchar(128) NOT NULL,
  `status` enum('success','error') NOT NULL,
  `latencyMs` int NOT NULL,
  `timeToFirstTokenMs` int,
  `inputTokens` int NOT NULL DEFAULT 0,
  `outputTokens` int NOT NULL DEFAULT 0,
  `estimatedCostUsd` float NOT NULL DEFAULT 0,
  `errorType` varchar(128),
  `errorMessage` text,
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `finishedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `ai_requests_id` PRIMARY KEY(`id`),
  CONSTRAINT `ai_requests_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE INDEX `ai_requests_feature_idx` ON `ai_requests` (`feature`);
--> statement-breakpoint
CREATE INDEX `ai_requests_provider_model_idx` ON `ai_requests` (`provider`,`model`);
--> statement-breakpoint
CREATE INDEX `ai_requests_status_idx` ON `ai_requests` (`status`);
--> statement-breakpoint
CREATE INDEX `ai_requests_finished_idx` ON `ai_requests` (`finishedAt`);
--> statement-breakpoint

CREATE TABLE `provider_health_checks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(64) NOT NULL,
  `model` varchar(128) NOT NULL,
  `status` enum('healthy','degraded','down') NOT NULL,
  `latencyMs` int,
  `errorMessage` text,
  `checkedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `provider_health_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `provider_health_checks_provider_time_idx` ON `provider_health_checks` (`provider`,`checkedAt`);
--> statement-breakpoint

CREATE TABLE `page_views` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int,
  `path` varchar(512) NOT NULL,
  `referrer` varchar(1024),
  `ipAddress` varchar(64),
  `userAgent` varchar(512),
  `viewedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `page_views_path_idx` ON `page_views` (`path`);
--> statement-breakpoint
CREATE INDEX `page_views_viewedAt_idx` ON `page_views` (`viewedAt`);
--> statement-breakpoint

CREATE TABLE `event_metrics` (
  `id` int AUTO_INCREMENT NOT NULL,
  `metric` varchar(128) NOT NULL,
  `dimension` varchar(128),
  `value` float NOT NULL,
  `measuredAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `event_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `event_metrics_metric_time_idx` ON `event_metrics` (`metric`,`measuredAt`);
