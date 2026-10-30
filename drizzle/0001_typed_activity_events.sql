ALTER TABLE "activity_events" DROP CONSTRAINT "activity_events_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "activity_events" ALTER COLUMN "actor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "type" text DEFAULT 'project.note' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "source" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "task_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_project_type" ON "activity_events" USING btree ("project_id","type");