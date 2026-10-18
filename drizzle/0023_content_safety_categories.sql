ALTER TABLE `safety_scan_events` ADD COLUMN `matched_sections` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `safety_scan_events` ADD COLUMN `queue` text;--> statement-breakpoint
ALTER TABLE `safety_cases` ADD COLUMN `matched_sections` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `safety_cases` ADD COLUMN `queue` text NOT NULL DEFAULT 'general';--> statement-breakpoint
UPDATE `safety_cases` SET `queue` = 'system' WHERE `reason` = 'scanner_unavailable';--> statement-breakpoint
CREATE INDEX `safety_cases_queue_idx` ON `safety_cases` (`status`, `queue`, `created_at`);
