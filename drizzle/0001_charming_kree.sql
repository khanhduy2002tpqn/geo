CREATE TABLE IF NOT EXISTS `geometry_shape_originals` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
