CREATE TABLE `relative_terms_vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`term` text NOT NULL,
	`category` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vocab_term_unique` ON `relative_terms_vocabulary` (`term`);--> statement-breakpoint
CREATE INDEX `vocab_category_idx` ON `relative_terms_vocabulary` (`category`);--> statement-breakpoint
CREATE INDEX `vocab_active_idx` ON `relative_terms_vocabulary` (`active`);--> statement-breakpoint
INSERT OR IGNORE INTO `relative_terms_vocabulary` (`id`, `term`, `category`) VALUES
('seed-cute', 'cute', 'physical'),
('seed-pretty', 'pretty', 'physical'),
('seed-attractive', 'attractive', 'physical'),
('seed-hot', 'hot', 'physical'),
('seed-fit', 'fit', 'physical'),
('seed-athletic', 'athletic', 'physical'),
('seed-slim', 'slim', 'physical'),
('seed-thick', 'thick', 'physical'),
('seed-large', 'large', 'physical'),
('seed-small', 'small', 'physical'),
('seed-tall', 'tall', 'physical'),
('seed-short', 'short', 'physical'),
('seed-average', 'average', 'physical'),
('seed-nearby', 'nearby', 'distance'),
('seed-close', 'close', 'distance'),
('seed-local', 'local', 'distance'),
('seed-far', 'far', 'distance'),
('seed-young', 'young', 'age'),
('seed-older', 'older', 'age'),
('seed-mature', 'mature', 'age'),
('seed-younger', 'younger', 'age'),
('seed-serious', 'serious', 'personality'),
('seed-casual', 'casual', 'personality'),
('seed-laid-back', 'laid back', 'personality'),
('seed-intense', 'intense', 'personality'),
('seed-outgoing', 'outgoing', 'personality'),
('seed-soon', 'soon', 'timing'),
('seed-later', 'later', 'timing'),
('seed-regular', 'regular', 'timing'),
('seed-occasional', 'occasional', 'timing'),
('seed-often', 'often', 'timing');