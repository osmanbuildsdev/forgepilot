ALTER TABLE "tasks" ADD COLUMN "assignee_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimate_points" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_assignee" ON "tasks" USING btree ("assignee_id");