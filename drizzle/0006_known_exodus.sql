CREATE TABLE `listing_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`vault_photo_id` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`purged_at` integer,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vault_photo_id`) REFERENCES `photo_vault`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listing_photos_listing_idx` ON `listing_photos` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_photos_vault_idx` ON `listing_photos` (`vault_photo_id`);--> statement-breakpoint
CREATE TABLE `photo_blocklist` (
	`id` text PRIMARY KEY NOT NULL,
	`p_hash` text NOT NULL,
	`reason` text NOT NULL,
	`source_user_id` text,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `photo_blocklist_p_hash_unique` ON `photo_blocklist` (`p_hash`);--> statement-breakpoint
CREATE INDEX `blocklist_phash_idx` ON `photo_blocklist` (`p_hash`);--> statement-breakpoint
CREATE TABLE `photo_vault` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`cf_image_id` text NOT NULL,
	`p_hash` text,
	`scan_status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` integer,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vault_user_idx` ON `photo_vault` (`user_id`);--> statement-breakpoint
CREATE INDEX `vault_scan_idx` ON `photo_vault` (`scan_status`);--> statement-breakpoint
DROP TABLE `contact_methods`;--> statement-breakpoint
DROP TABLE `listing_media`;--> statement-breakpoint
ALTER TABLE `key_exchanges` DROP COLUMN `contact_method_ids`;