DROP TABLE `geometry_shape_construction_steps`;--> statement-breakpoint
DROP TABLE `geometry_shape_qa`;--> statement-breakpoint
ALTER TABLE `geometry_shapes` DROP COLUMN `stats_properties`;--> statement-breakpoint
ALTER TABLE `geometry_shapes` DROP COLUMN `experiment`;--> statement-breakpoint
ALTER TABLE `geometry_shapes` DROP COLUMN `mini_experiment_steps`;--> statement-breakpoint
ALTER TABLE `geometry_shapes` DROP COLUMN `formula_content`;