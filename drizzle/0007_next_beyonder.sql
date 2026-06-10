ALTER TABLE `user_profiles` ADD `alias` text;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `is_supporter` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `profiles_alias_idx` ON `user_profiles` (`alias`);