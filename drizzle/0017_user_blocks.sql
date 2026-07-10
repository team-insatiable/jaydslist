CREATE TABLE `user_blocks` (
  `id` text PRIMARY KEY NOT NULL,
  `blocker_id` text NOT NULL REFERENCES `user`(`id`),
  `blocked_id` text NOT NULL REFERENCES `user`(`id`),
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX `blocker_blocked_uniq` ON `user_blocks` (`blocker_id`, `blocked_id`);
CREATE INDEX `user_blocks_blocker_idx` ON `user_blocks` (`blocker_id`);
