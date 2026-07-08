ALTER TABLE `messages` ADD `is_expiring` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `photo_viewed_at` integer;