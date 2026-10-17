ALTER TABLE `reports` ADD COLUMN `evidence_snapshot` text;--> statement-breakpoint
ALTER TABLE `reports` ADD COLUMN `evidence_captured_at` integer;--> statement-breakpoint
CREATE TABLE `safety_rule_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`rules_json` text NOT NULL,
	`reason` text NOT NULL,
	`created_by` text NOT NULL REFERENCES `user_profiles`(`id`),
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `safety_rule_revisions_version_unique` ON `safety_rule_revisions` (`version`);--> statement-breakpoint
CREATE TABLE `safety_rule_state` (
	`id` text PRIMARY KEY NOT NULL CHECK (`id` = 'active'),
	`revision_id` text NOT NULL REFERENCES `safety_rule_revisions`(`id`),
	`updated_by` text NOT NULL REFERENCES `user_profiles`(`id`),
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
