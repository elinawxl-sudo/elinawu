CREATE TABLE `recipe_ratings` (
	`dish_id` text PRIMARY KEY NOT NULL,
	`rating` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
