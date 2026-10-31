import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  bigint,
  uniqueIndex,
  index,
  pgEnum,
  jsonb,
  date,
  primaryKey,
  type AnyPgColumn,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
const dates = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  ...dates(),
});
export const session = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...dates(),
});
export const account = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  ...dates(),
});
export const verification = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ...dates(),
});
export const rateLimit = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const roleEnum = pgEnum("workspace_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);
export const statusEnum = pgEnum("task_status", [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
]);
export const priorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);
export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ...dates(),
});
export const members = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: roleEnum("role").default("member").notNull(),
    ...dates(),
  },
  (t) => [uniqueIndex("member_workspace_user").on(t.workspaceId, t.userId)],
);
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull(),
    description: text("description").default("").notNull(),
    nextTaskNumber: integer("next_task_number").default(0).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    ...dates(),
  },
  (t) => [uniqueIndex("project_workspace_key").on(t.workspaceId, t.key)],
);
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    status: statusEnum("status").default("backlog").notNull(),
    priority: priorityEnum("priority").default("medium").notNull(),
    assigneeId: text("assignee_id").references(() => user.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date", { mode: "string" }),
    estimatePoints: integer("estimate_points"),
    // Set when the task enters "done", cleared when it leaves.
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sprintId: uuid("sprint_id").references((): AnyPgColumn => sprints.id, {
      onDelete: "set null",
    }),
    milestoneId: uuid("milestone_id").references(
      (): AnyPgColumn => milestones.id,
      { onDelete: "set null" },
    ),
    // Custom board column; when null the task sits in the first column of
    // its status.
    columnId: uuid("column_id").references(
      (): AnyPgColumn => projectColumns.id,
      { onDelete: "set null" },
    ),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    ...dates(),
  },
  (t) => [
    uniqueIndex("task_project_number").on(t.projectId, t.number),
    index("task_project_status").on(t.projectId, t.status),
    index("task_assignee").on(t.assigneeId),
    index("task_sprint").on(t.sprintId),
    index("task_milestone").on(t.milestoneId),
    index("task_project_completed").on(t.projectId, t.completedAt),
  ],
);
export const sprintStatusEnum = pgEnum("sprint_status", [
  "planned",
  "active",
  "completed",
]);
export const sprints = pgTable(
  "sprints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal").default("").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    status: sprintStatusEnum("status").default("planned").notNull(),
    // Snapshot taken when the sprint closes, so velocity history stays
    // stable even if tasks are edited or moved later.
    committedPoints: integer("committed_points"),
    completedPoints: integer("completed_points"),
    completedTasks: integer("completed_tasks"),
    retrospective: text("retrospective").default("").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [
    index("sprint_project").on(t.projectId, t.startDate),
    uniqueIndex("sprint_one_active")
      .on(t.projectId)
      .where(sql`${t.status} = 'active'`),
  ],
);
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    dueDate: date("due_date", { mode: "string" }),
    ...dates(),
  },
  (t) => [index("milestone_project").on(t.projectId, t.dueDate)],
);
// Custom Kanban columns. Each belongs to one status, so reports and health
// keep working on statuses while teams shape the board as they like.
export const projectColumns = pgTable(
  "project_columns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: statusEnum("status").notNull(),
    position: integer("position").notNull(),
    ...dates(),
  },
  (t) => [
    uniqueIndex("column_project_name").on(t.projectId, t.name),
    index("column_project_position").on(t.projectId, t.position),
  ],
);
export const labels = pgTable(
  "labels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#6b7280").notNull(),
    ...dates(),
  },
  (t) => [uniqueIndex("label_project_name").on(t.projectId, t.name)],
);
export const taskLabels = pgTable(
  "task_labels",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.labelId] }),
    index("task_label_label").on(t.labelId),
  ],
);
export const ACTIVITY_TYPES = [
  "project.note",
  "task.created",
  "task.updated",
  "task.completed",
  "task.deleted",
  "label.created",
  "comment.created",
  "project.created",
  "project.updated",
  "document.created",
  "document.updated",
  "github.commit",
  "github.pull_request",
  "github.suggestion",
  "sprint.started",
  "sprint.completed",
  "milestone.created",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export const ACTIVITY_SOURCES = ["user", "ai", "github", "system"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];
export const activities = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Null when the event comes from a system, AI or GitHub source.
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: text("type").$type<ActivityType>().default("project.note").notNull(),
    source: text("source").$type<ActivitySource>().default("user").notNull(),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    message: text("message").notNull(),
    ...dates(),
  },
  (t) => [
    index("activity_project_date").on(t.projectId, t.createdAt),
    index("activity_project_type").on(t.projectId, t.type),
  ],
);
export const subtasks = pgTable(
  "subtasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: boolean("done").default(false).notNull(),
    position: integer("position").default(0).notNull(),
    ...dates(),
  },
  (t) => [index("subtask_task").on(t.taskId, t.position)],
);
// "taskId cannot finish before dependsOnId is done." Both tasks share a project.
export const taskDependencies = pgTable(
  "task_dependencies",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnId: uuid("depends_on_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.dependsOnId] }),
    index("dependency_depends_on").on(t.dependsOnId),
  ],
);
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});
// File contents live in PostgreSQL so no extra storage service is needed;
// the upload limit keeps rows small.
export const taskAttachments = pgTable(
  "task_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("attachment_task").on(t.taskId, t.createdAt)],
);
export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    // Comments outlive their author's account; the name is then shown as removed.
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [index("comment_task_date").on(t.taskId, t.createdAt)],
);
export const aiGenerationStatus = pgEnum("ai_generation_status", [
  "succeeded",
  "failed",
  "applied",
]);
// Every AI call is recorded: what was asked, what came back, and whether the
// user applied it. Outputs are never written to project tables directly.
export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    model: text("model").notNull(),
    input: jsonb("input").notNull(),
    output: jsonb("output"),
    status: aiGenerationStatus("status").notNull(),
    error: text("error"),
    ...dates(),
  },
  (t) => [index("ai_generation_user_date").on(t.userId, t.createdAt)],
);
// One row per project per day, so health can be charted over time.
export const projectHealthSnapshots = pgTable(
  "project_health_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    score: integer("score").notNull(),
    factors: jsonb("factors").notNull(),
    ...dates(),
  },
  (t) => [uniqueIndex("health_project_day").on(t.projectId, t.day)],
);
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").default("").notNull(),
    // App-relative link, e.g. /app/projects/<id>/board.
    href: text("href").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "cascade",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [
    index("notification_user_date").on(t.userId, t.createdAt),
    index("notification_user_unread")
      .on(t.userId)
      .where(sql`${t.readAt} is null`),
  ],
);
export const documentSourceEnum = pgEnum("document_source", [
  "manual",
  "markdown_import",
  "ai_generated",
  "template_generated",
]);
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    contentMarkdown: text("content_markdown").default("").notNull(),
    // Parsed headings, frontmatter and references, refreshed on every save.
    structure: jsonb("structure").notNull(),
    sourceType: documentSourceEnum("source_type").default("manual").notNull(),
    sourceFilename: text("source_filename"),
    // "builtin:<id>" or a document_templates id when created from a template.
    templateRef: text("template_ref"),
    currentVersion: integer("current_version").default(1).notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...dates(),
  },
  (t) => [
    index("document_project_updated").on(t.projectId, t.updatedAt),
    index("document_workspace").on(t.workspaceId),
  ],
);
// Workspace templates. Built-in ones live in code and are copied here when
// duplicated, so every editable template is a real row.
export const documentTemplates = pgTable(
  "document_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    parsedStructure: jsonb("parsed_structure").notNull(),
    // Built-in template id or document id it was created from, if any.
    origin: text("origin"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...dates(),
  },
  (t) => [index("template_workspace").on(t.workspaceId, t.name)],
);
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    contentMarkdown: text("content_markdown").notNull(),
    note: text("note").default("").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("document_version_number").on(t.documentId, t.versionNumber),
  ],
);
// --- GitHub -----------------------------------------------------------------
// GitHub ids are stored as bigint numbers; they fit in JS safe integers.
export const githubInstallations = pgTable("github_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  installationId: bigint("installation_id", { mode: "number" })
    .notNull()
    .unique(),
  accountLogin: text("account_login").notNull(),
  accountType: text("account_type").notNull(),
  // Bound after a workspace admin finishes the install flow.
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  connectedBy: text("connected_by").references(() => user.id, {
    onDelete: "set null",
  }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...dates(),
});
export const githubRepositories = pgTable(
  "github_repositories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    installationId: uuid("installation_id")
      .notNull()
      .references(() => githubInstallations.id, { onDelete: "cascade" }),
    githubId: bigint("github_id", { mode: "number" }).notNull().unique(),
    fullName: text("full_name").notNull(),
    defaultBranch: text("default_branch"),
    private: boolean("private").default(false).notNull(),
    htmlUrl: text("html_url").notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    // Set when access is removed from the installation; rows are kept for history.
    removedAt: timestamp("removed_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [index("repo_installation").on(t.installationId)],
);
export const projectRepositories = pgTable(
  "project_repositories",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    connectedBy: text("connected_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.repositoryId] }),
    index("project_repo_repo").on(t.repositoryId),
  ],
);
export const githubCommits = pgTable(
  "github_commits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    sha: text("sha").notNull(),
    message: text("message").notNull(),
    authorName: text("author_name"),
    authorLogin: text("author_login"),
    branch: text("branch"),
    url: text("url").notNull(),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull(),
    ...dates(),
  },
  (t) => [
    uniqueIndex("commit_repo_sha").on(t.repositoryId, t.sha),
    index("commit_repo_date").on(t.repositoryId, t.committedAt),
  ],
);
export const pullRequestState = pgEnum("pull_request_state", [
  "open",
  "closed",
  "merged",
]);
export const githubPullRequests = pgTable(
  "github_pull_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    body: text("body").default("").notNull(),
    state: pullRequestState("state").notNull(),
    draft: boolean("draft").default(false).notNull(),
    authorLogin: text("author_login"),
    url: text("url").notNull(),
    headRef: text("head_ref"),
    headSha: text("head_sha"),
    // Latest check result for the head commit: success, failure, pending…
    checkStatus: text("check_status"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [
    uniqueIndex("pr_repo_number").on(t.repositoryId, t.number),
    index("pr_head_sha").on(t.headSha),
  ],
);
export const githubEventStatus = pgEnum("github_event_status", [
  "received",
  "processed",
  "ignored",
  "failed",
]);
// Raw webhook deliveries. The delivery id makes processing idempotent.
export const githubEvents = pgTable(
  "github_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deliveryId: text("delivery_id").notNull().unique(),
    event: text("event").notNull(),
    action: text("action"),
    installationId: bigint("installation_id", { mode: "number" }),
    repositoryGithubId: bigint("repository_github_id", { mode: "number" }),
    payload: jsonb("payload").notNull(),
    status: githubEventStatus("status").default("received").notNull(),
    error: text("error"),
    attempts: integer("attempts").default(0).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [index("github_event_status").on(t.status, t.createdAt)],
);
export const githubLinkKind = pgEnum("github_link_kind", [
  "commit",
  "pull_request",
]);
// "pending" means GitHub activity suggests the task may be done; a person
// confirms or dismisses it. Tasks are never closed automatically.
export const completionSuggestion = pgEnum("completion_suggestion", [
  "none",
  "pending",
  "confirmed",
  "dismissed",
]);
export const taskGithubLinks = pgTable(
  "task_github_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    kind: githubLinkKind("kind").notNull(),
    // Commit sha or pull request number.
    ref: text("ref").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    state: text("state"),
    suggestion: completionSuggestion("suggestion").default("none").notNull(),
    ...dates(),
  },
  (t) => [
    uniqueIndex("task_link_unique").on(t.taskId, t.repositoryId, t.kind, t.ref),
    index("task_link_task").on(t.taskId),
  ],
);
export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").default("member").notNull(),
    // Only the SHA-256 of the invite token is stored; the raw token is shown once.
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...dates(),
  },
  (t) => [
    index("invitation_workspace").on(t.workspaceId),
    uniqueIndex("invitation_pending_email")
      .on(t.workspaceId, t.email)
      .where(sql`${t.acceptedAt} is null and ${t.revokedAt} is null`),
  ],
);
export type Task = typeof tasks.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type Sprint = typeof sprints.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type ProjectColumn = typeof projectColumns.$inferSelect;
