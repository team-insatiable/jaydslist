CREATE TABLE `photo_albums` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `albums_user_idx` ON `photo_albums` (`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`cf_image_id` text,
	`scan_status` text DEFAULT 'pending' NOT NULL,
	`quality_score` real,
	`quality_flags` text DEFAULT '[]' NOT NULL,
	`similarity_score` real,
	`was_prompted` integer DEFAULT false NOT NULL,
	`was_rewritten` integer DEFAULT false NOT NULL,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `conversation_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "thread_id", "sender_id", "body", "cf_image_id", "scan_status", "quality_score", "quality_flags", "similarity_score", "was_prompted", "was_rewritten", "sent_at", "read_at") SELECT "id", "thread_id", "sender_id", "body", "cf_image_id", "scan_status", "quality_score", "quality_flags", "similarity_score", "was_prompted", "was_rewritten", "sent_at", "read_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `messages_thread_idx` ON `messages` (`thread_id`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `messages_scan_status_idx` ON `messages` (`scan_status`);--> statement-breakpoint
CREATE INDEX `messages_sent_at_idx` ON `messages` (`sent_at`);--> statement-breakpoint
ALTER TABLE `photo_vault` ADD `album_id` text REFERENCES photo_albums(id);--> statement-breakpoint
CREATE INDEX `vault_album_idx` ON `photo_vault` (`album_id`);