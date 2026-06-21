CREATE TABLE IF NOT EXISTS `geometry_cache` (
	`hash` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`spec` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_examples` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`level` text NOT NULL,
	`geometry_json` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_construction_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`step_index` integer NOT NULL,
	`description` text NOT NULL,
	`narration` text NOT NULL,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`edge_id` text NOT NULL,
	`from_vertex` text NOT NULL,
	`to_vertex` text NOT NULL,
	`edge_type` text NOT NULL,
	`length` real,
	`param_key` text,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_examples` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`level` text NOT NULL,
	`grade` text NOT NULL,
	`prompt` text NOT NULL,
	`params` text,
	`given_params` text,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_faces` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`face_id` text NOT NULL,
	`vertices` text NOT NULL,
	`face_type` text NOT NULL,
	`area` real,
	`normal` text,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_keywords` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`keyword` text NOT NULL,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`metric_key` text NOT NULL,
	`value` real NOT NULL,
	`unit` text,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_qa` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_special_points` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`point_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`on_edge` text,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shape_vertices` (
	`id` text PRIMARY KEY NOT NULL,
	`shape_key` text NOT NULL,
	`vertex_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`shape_key`) REFERENCES `geometry_shapes`(`shape_key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geometry_shapes` (
	`shape_key` text PRIMARY KEY NOT NULL,
	`name_vi` text NOT NULL,
	`type` text NOT NULL,
	`level` text NOT NULL,
	`topo_vertices` integer DEFAULT 0 NOT NULL,
	`topo_edges` integer DEFAULT 0 NOT NULL,
	`topo_faces` integer DEFAULT 0 NOT NULL,
	`topo_euler` integer,
	`fallback_spec` text NOT NULL,
	`formulas` text NOT NULL,
	`stats_properties` text NOT NULL,
	`experiment` text NOT NULL,
	`mini_experiment_steps` text NOT NULL,
	`formula_content` text NOT NULL,
	`lesson_content` text,
	`object_descriptions` text,
	`suggested_questions` text NOT NULL,
	`surface_type` text,
	`surface_params` text,
	`cross_section` text,
	`model_construction_steps` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
