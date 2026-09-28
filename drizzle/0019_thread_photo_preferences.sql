ALTER TABLE `conversation_threads` ADD COLUMN `initiator_nsfw_choice` text NOT NULL DEFAULT 'inherit';
--> statement-breakpoint
ALTER TABLE `conversation_threads` ADD COLUMN `poster_nsfw_choice` text NOT NULL DEFAULT 'inherit';
