CREATE TABLE "project_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "task_status" NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "column_id" uuid;--> statement-breakpoint
ALTER TABLE "project_columns" ADD CONSTRAINT "project_columns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "column_project_name" ON "project_columns" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "column_project_position" ON "project_columns" USING btree ("project_id","position");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_column_id_project_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."project_columns"("id") ON DELETE set null ON UPDATE no action;