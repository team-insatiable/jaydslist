ALTER TABLE `user_profiles` ADD `lat` real;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `lng` real;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `location_updated_at` integer;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `seeking_identity` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `seeking_physical_type` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `seeking_nature_of_connection` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `browse_radius` integer NOT NULL DEFAULT 25;
