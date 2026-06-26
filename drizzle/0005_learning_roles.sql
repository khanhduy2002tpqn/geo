CREATE TABLE `learning_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `learning_users_email_unique` ON `learning_users` (`email`);
--> statement-breakpoint
CREATE TABLE `teacher_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`shape_key` text NOT NULL,
	`title` text NOT NULL,
	`question_type` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text,
	`answer` text NOT NULL,
	`topic` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`teacher_id`) REFERENCES `learning_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `student_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`shape_key` text NOT NULL,
	`source` text NOT NULL,
	`exercise_id` text,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`weak_topics` text NOT NULL,
	`answers` text NOT NULL,
	`self_assessment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `learning_users`(`id`) ON UPDATE no action ON DELETE cascade
);
