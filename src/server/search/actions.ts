"use server";
import { z } from "zod";
import { and, desc, eq, inArray, or, sql, type AnyColumn } from "drizzle-orm";
import { attempt } from "@/server/errors";
import { db } from "@/server/db";
import { members, projects, tasks, user as users } from "@/server/db/schema";
import { requireUser } from "@/server/projects/service";

export type SearchHit = {
  kind: "project" | "task" | "person";
  id: string;
  title: string;
  hint: string;
  href: string;
};

// Turkish has dotted and dotless i, and PostgreSQL's case folding does not
// match "ışık" with "IŞIK". Both sides are folded the same way instead.
const fold = (q: string) => q.replace(/[İIı]/g, "i").toLowerCase();
// Escapes LIKE wildcards so user input is matched literally.
const pattern = (q: string) =>
  `%${fold(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const matches = (column: AnyColumn, q: string) =>
  sql`lower(translate(${column}, 'İIı', 'iii')) like ${pattern(q)}`;

export async function search(input: unknown) {
  return attempt(async (): Promise<SearchHit[]> => {
    const q = z.string().trim().min(1).max(100).parse(input);
    const user = await requireUser();
    const myWorkspaces = db
      .select({ id: members.workspaceId })
      .from(members)
      .where(eq(members.userId, user.id));
    const visibleProjects = db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.workspaceId, myWorkspaces));

    // "FORGE-24" jumps straight to that task.
    const keyMatch = q.toUpperCase().match(/^([A-Z][A-Z0-9]{1,9})-(\d{1,7})$/);
    const taskWhere = keyMatch
      ? and(
          eq(projects.key, keyMatch[1]),
          eq(tasks.number, Number(keyMatch[2])),
        )
      : matches(tasks.title, q);

    const [projectRows, taskRows, people] = await Promise.all([
      db
        .select({ id: projects.id, name: projects.name, key: projects.key })
        .from(projects)
        .where(
          and(
            inArray(projects.id, visibleProjects),
            or(matches(projects.name, q), matches(projects.key, q)),
          ),
        )
        .orderBy(desc(projects.updatedAt))
        .limit(5),
      db
        .select({
          id: tasks.id,
          number: tasks.number,
          title: tasks.title,
          projectId: projects.id,
          projectKey: projects.key,
          projectName: projects.name,
        })
        .from(tasks)
        .innerJoin(projects, eq(projects.id, tasks.projectId))
        .where(and(inArray(tasks.projectId, visibleProjects), taskWhere))
        .orderBy(desc(tasks.updatedAt))
        .limit(8),
      db
        .selectDistinct({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .innerJoin(members, eq(members.userId, users.id))
        .where(
          and(
            inArray(members.workspaceId, myWorkspaces),
            or(matches(users.name, q), matches(users.email, q)),
          ),
        )
        .limit(5),
    ]);

    return [
      ...taskRows.map((t) => ({
        kind: "task" as const,
        id: t.id,
        title: t.title,
        hint: `${t.projectKey}-${t.number} · ${t.projectName}`,
        href: `/app/projects/${t.projectId}/board`,
      })),
      ...projectRows.map((p) => ({
        kind: "project" as const,
        id: p.id,
        title: p.name,
        hint: p.key,
        href: `/app/projects/${p.id}`,
      })),
      ...people.map((p) => ({
        kind: "person" as const,
        id: p.id,
        title: p.name,
        hint: p.email,
        href: "/app/settings/members",
      })),
    ];
  });
}
