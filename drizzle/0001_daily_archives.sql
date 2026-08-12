CREATE TABLE `daily_archives` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL UNIQUE,
	`ingredients` text NOT NULL,
	`total_intake` text NOT NULL,
	`improvement` text NOT NULL,
	`meals` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
