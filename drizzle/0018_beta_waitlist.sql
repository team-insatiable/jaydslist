CREATE TABLE `beta_waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL UNIQUE,
	`status` text NOT NULL DEFAULT 'pending',
	`confirmation_token_hash` text,
	`confirmation_expires_at` integer,
	`confirmed_at` integer,
	`created_at` integer NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX `beta_waitlist_status_idx` ON `beta_waitlist` (`status`);
