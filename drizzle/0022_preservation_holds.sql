CREATE TABLE `preservation_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL CHECK (`target_type` IN ('report', 'safety_case')),
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`placed_by` text NOT NULL REFERENCES `user_profiles`(`id`),
	`placed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`released_by` text REFERENCES `user_profiles`(`id`),
	`released_at` integer,
	`release_reason` text,
	CHECK ((`released_at` IS NULL AND `released_by` IS NULL AND `release_reason` IS NULL) OR
		(`released_at` IS NOT NULL AND `released_by` IS NOT NULL AND `release_reason` IS NOT NULL))
);--> statement-breakpoint
CREATE UNIQUE INDEX `preservation_holds_active_idx` ON `preservation_holds` (`target_type`, `target_id`) WHERE `released_at` IS NULL;--> statement-breakpoint
CREATE INDEX `preservation_holds_target_idx` ON `preservation_holds` (`target_type`, `target_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `preservation_hold_release_once_idx` ON `moderation_actions` (`target_id`) WHERE `target_type` = 'preservation_hold' AND `action_type` = 'released';
