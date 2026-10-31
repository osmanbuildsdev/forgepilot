import type { Metadata } from "next";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { projects } from "@/server/db/schema";
import { requireUser, userWorkspaces } from "@/server/projects/service";
import { workspaceGithub } from "@/server/github/queries";
import { githubAppConfigured } from "@/server/github/security";
import { canWrite } from "@/server/permissions";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Başlarken" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    step?: string;
    workspace?: string;
    project?: string;
    mode?: string;
    connected?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const spaces = (await userWorkspaces(user.id)).filter((w) =>
    canWrite(w.role),
  );
  // Everything taken from the URL is checked against the user's own data.
  const workspace = spaces.find((w) => w.id === query.workspace) ?? null;
  let step = Math.min(Math.max(Number(query.step) || 1, 1), 5);
  if (step >= 3 && !workspace) step = 2;
  const [project] =
    workspace && query.project
      ? await db
          .select({ id: projects.id, name: projects.name, key: projects.key })
          .from(projects)
          .where(
            and(
              eq(projects.id, query.project),
              eq(projects.workspaceId, workspace.id),
            ),
          )
          .catch(() => [])
      : [];
  const github = workspace
    ? (await workspaceGithub(user.id)).filter(
        (i) => i.workspaceId === workspace.id,
      )
    : [];
  return (
    <OnboardingWizard
      step={step}
      user={{ name: user.name }}
      workspaces={spaces.map((w) => ({ id: w.id, name: w.name, role: w.role }))}
      workspace={
        workspace
          ? { id: workspace.id, name: workspace.name, role: workspace.role }
          : null
      }
      project={project ?? null}
      mode={query.mode === "import" ? "import" : "default"}
      githubConfigured={githubAppConfigured()}
      repositories={github.flatMap((i) =>
        i.repositories.map((r) => ({
          id: r.id,
          fullName: r.fullName,
          linked: r.projects.length > 0,
        })),
      )}
      aiEnabled={Boolean(process.env.GEMINI_API_KEY)}
      githubResult={
        query.connected ? "connected" : query.error ? query.error : null
      }
    />
  );
}
