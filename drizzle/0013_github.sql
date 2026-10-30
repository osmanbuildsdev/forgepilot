CREATE TYPE "public"."completion_suggestion" AS ENUM('none', 'pending', 'confirmed', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."github_event_status" AS ENUM('received', 'processed', 'ignored', 'failed');--> statement-breakpoint
CREATE TYPE "public"."github_link_kind" AS ENUM('commit', 'pull_request');--> statement-breakpoint
CREATE TYPE "public"."pull_request_state" AS ENUM('open', 'closed', 'merged');--> statement-breakpoint
CREATE TABLE "github_commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"author_name" text,
	"author_login" text,
	"branch" text,
	"url" text NOT NULL,
	"committed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" text NOT NULL,
	"event" text NOT NULL,
	"action" text,
	"installation_id" bigint,
	"repository_github_id" bigint,
	"payload" jsonb NOT NULL,
	"status" "github_event_status" DEFAULT 'received' NOT NULL,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_events_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" bigint NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"workspace_id" uuid,
	"connected_by" text,
	"suspended_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE "github_pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"state" "pull_request_state" NOT NULL,
	"draft" boolean DEFAULT false NOT NULL,
	"author_login" text,
	"url" text NOT NULL,
	"head_ref" text,
	"head_sha" text,
	"check_status" text,
	"opened_at" timestamp with time zone NOT NULL,
	"merged_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"github_id" bigint NOT NULL,
	"full_name" text NOT NULL,
	"default_branch" text,
	"private" boolean DEFAULT false NOT NULL,
	"html_url" text NOT NULL,
	"last_activity_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_repositories_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE "project_repositories" (
	"project_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"connected_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_repositories_project_id_repository_id_pk" PRIMARY KEY("project_id","repository_id")
);
--> statement-breakpoint
CREATE TABLE "task_github_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"kind" "github_link_kind" NOT NULL,
	"ref" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"state" text,
	"suggestion" "completion_suggestion" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_commits" ADD CONSTRAINT "github_commits_repository_id_github_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_repository_id_github_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_installation_id_github_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_repository_id_github_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_repositories" ADD CONSTRAINT "project_repositories_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_github_links" ADD CONSTRAINT "task_github_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_github_links" ADD CONSTRAINT "task_github_links_repository_id_github_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."github_repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commit_repo_sha" ON "github_commits" USING btree ("repository_id","sha");--> statement-breakpoint
CREATE INDEX "commit_repo_date" ON "github_commits" USING btree ("repository_id","committed_at");--> statement-breakpoint
CREATE INDEX "github_event_status" ON "github_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pr_repo_number" ON "github_pull_requests" USING btree ("repository_id","number");--> statement-breakpoint
CREATE INDEX "pr_head_sha" ON "github_pull_requests" USING btree ("head_sha");--> statement-breakpoint
CREATE INDEX "repo_installation" ON "github_repositories" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "project_repo_repo" ON "project_repositories" USING btree ("repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_link_unique" ON "task_github_links" USING btree ("task_id","repository_id","kind","ref");--> statement-breakpoint
CREATE INDEX "task_link_task" ON "task_github_links" USING btree ("task_id");