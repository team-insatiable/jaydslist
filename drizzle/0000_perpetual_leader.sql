CREATE TABLE `contact_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contact_methods_user_idx` ON `contact_methods` (`user_id`);--> statement-breakpoint
CREATE INDEX `contact_methods_active_idx` ON `contact_methods` (`user_id`,`active`);--> statement-breakpoint
CREATE TABLE `conversation_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`initiator_id` text NOT NULL,
	`poster_id` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`acknowledged_requirements` text DEFAULT '[]' NOT NULL,
	`initiator_response_rate` real,
	`initiator_warned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_activity_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`initiator_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`poster_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `threads_listing_idx` ON `conversation_threads` (`listing_id`);--> statement-breakpoint
CREATE INDEX `threads_initiator_idx` ON `conversation_threads` (`initiator_id`);--> statement-breakpoint
CREATE INDEX `threads_poster_idx` ON `conversation_threads` (`poster_id`);--> statement-breakpoint
CREATE INDEX `threads_status_idx` ON `conversation_threads` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `threads_unique_per_listing` ON `conversation_threads` (`listing_id`,`initiator_id`);--> statement-breakpoint
CREATE TABLE `key_exchanges` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`offering_user_id` text NOT NULL,
	`receiving_user_id` text NOT NULL,
	`status` text DEFAULT 'offered' NOT NULL,
	`contact_method_ids` text DEFAULT '[]' NOT NULL,
	`offered_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`thread_id`) REFERENCES `conversation_threads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`offering_user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiving_user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `key_exchanges_thread_idx` ON `key_exchanges` (`thread_id`);--> statement-breakpoint
CREATE INDEX `key_exchanges_offering_idx` ON `key_exchanges` (`offering_user_id`);--> statement-breakpoint
CREATE INDEX `key_exchanges_receiving_idx` ON `key_exchanges` (`receiving_user_id`);--> statement-breakpoint
CREATE TABLE `listing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_listing_idx` ON `listing_events` (`listing_id`);--> statement-breakpoint
CREATE INDEX `events_type_idx` ON `listing_events` (`event_type`);--> statement-breakpoint
CREATE TABLE `listing_media` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`scan_status` text DEFAULT 'pending' NOT NULL,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_listing_idx` ON `listing_media` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listing_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`type` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`prompt_text` text,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `requirements_listing_idx` ON `listing_requirements` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text DEFAULT 'casual_encounters' NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`looking_for_identity` text DEFAULT '[]' NOT NULL,
	`looking_for_physical` text DEFAULT '[]' NOT NULL,
	`age_range_min` integer,
	`age_range_max` integer,
	`nature_of_connection` text DEFAULT '[]' NOT NULL,
	`mood` text,
	`availability` text,
	`lat` real,
	`lng` real,
	`fuzzy_location` text,
	`expires_at` integer NOT NULL,
	`last_bumped_at` integer,
	`bump_count` integer DEFAULT 0 NOT NULL,
	`renewed_at` integer,
	`original_created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listings_user_idx` ON `listings` (`user_id`);--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`);--> statement-breakpoint
CREATE INDEX `listings_category_idx` ON `listings` (`category`);--> statement-breakpoint
CREATE INDEX `listings_last_bumped_at_idx` ON `listings` (`last_bumped_at`);--> statement-breakpoint
CREATE INDEX `listings_expires_at_idx` ON `listings` (`expires_at`);--> statement-breakpoint
CREATE TABLE `message_quality_log` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`check_type` text NOT NULL,
	`score` real,
	`flagged` integer DEFAULT false NOT NULL,
	`detail` text,
	`checked_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `quality_log_message_idx` ON `message_quality_log` (`message_id`);--> statement-breakpoint
CREATE INDEX `quality_log_sender_idx` ON `message_quality_log` (`sender_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
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
CREATE INDEX `messages_thread_idx` ON `messages` (`thread_id`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `messages_scan_status_idx` ON `messages` (`scan_status`);--> statement-breakpoint
CREATE INDEX `messages_sent_at_idx` ON `messages` (`sent_at`);--> statement-breakpoint
CREATE TABLE `moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action_type` text NOT NULL,
	`reason` text NOT NULL,
	`report_id` text,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mod_actions_actor_idx` ON `moderation_actions` (`actor_id`);--> statement-breakpoint
CREATE INDEX `mod_actions_target_idx` ON `moderation_actions` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `mod_actions_type_idx` ON `moderation_actions` (`action_type`);--> statement-breakpoint
CREATE TABLE `platform_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `relative_term_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`term` text NOT NULL,
	`definition` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `terms_listing_idx` ON `relative_term_definitions` (`listing_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `terms_unique_per_listing` ON `relative_term_definitions` (`listing_id`,`term`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`category` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_notes` text,
	`reporter_trust_score_snapshot` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`reporter_id`) REFERENCES `user_profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_reporter_idx` ON `reports` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`identity` text,
	`physical_type` text,
	`date_of_birth` integer,
	`age` integer,
	`phone_hash` text,
	`phone_verified` integer DEFAULT false NOT NULL,
	`phone_carrier_validated` integer DEFAULT false NOT NULL,
	`trust_tier` text DEFAULT 'new' NOT NULL,
	`reporter_trust_score` real DEFAULT 0.5 NOT NULL,
	`response_rate` real DEFAULT 0 NOT NULL,
	`total_threads` integer DEFAULT 0 NOT NULL,
	`responded_threads` integer DEFAULT 0 NOT NULL,
	`warning_issued` integer DEFAULT false NOT NULL,
	`warning_issued_at` integer,
	`dbbl_risk_score` real,
	`dbbl_risk_rating` text,
	`dbbl_last_checked_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`last_active_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_phone_hash_unique` ON `user_profiles` (`phone_hash`);--> statement-breakpoint
CREATE INDEX `profiles_phone_hash_idx` ON `user_profiles` (`phone_hash`);--> statement-breakpoint
CREATE INDEX `profiles_trust_tier_idx` ON `user_profiles` (`trust_tier`);--> statement-breakpoint
CREATE INDEX `profiles_status_idx` ON `user_profiles` (`status`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);