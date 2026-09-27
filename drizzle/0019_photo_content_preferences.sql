ALTER TABLE user_profiles ADD COLUMN allow_nsfw integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE photo_vault ADD COLUMN content_rating text NOT NULL DEFAULT 'unknown';
