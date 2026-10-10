ALTER TABLE `messages` ADD COLUMN `scan_revision_id` text REFERENCES `safety_rule_revisions`(`id`);--> statement-breakpoint
ALTER TABLE `listings` ADD COLUMN `scan_revision_id` text REFERENCES `safety_rule_revisions`(`id`);--> statement-breakpoint
UPDATE `messages` SET `scan_status` = 'cleared' WHERE `scan_status` = 'pending';--> statement-breakpoint
CREATE TABLE `safety_scan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`rule_revision_id` text REFERENCES `safety_rule_revisions`(`id`),
	`outcome` text NOT NULL,
	`matched_rule_ids` text NOT NULL DEFAULT '[]',
	`reason` text NOT NULL,
	`checked_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE INDEX `safety_scan_events_target_idx` ON `safety_scan_events` (`target_type`, `target_id`);--> statement-breakpoint
CREATE TABLE `safety_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`submitter_id` text NOT NULL REFERENCES `user_profiles`(`id`),
	`rule_revision_id` text REFERENCES `safety_rule_revisions`(`id`),
	`matched_rule_ids` text NOT NULL DEFAULT '[]',
	`reason` text NOT NULL,
	`evidence_snapshot` text NOT NULL,
	`release_status` text,
	`status` text NOT NULL DEFAULT 'pending',
	`reviewer_id` text REFERENCES `user_profiles`(`id`),
	`reviewer_notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer
);--> statement-breakpoint
CREATE INDEX `safety_cases_status_idx` ON `safety_cases` (`status`, `created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `safety_case_decision_once_idx` ON `moderation_actions` (`target_id`) WHERE `target_type` = 'safety_case' AND `action_type` IN ('release', 'reject');
