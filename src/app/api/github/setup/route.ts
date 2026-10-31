import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { githubInstallations } from "@/server/db/schema";
import { currentUser, workspaceAccess } from "@/server/projects/service";
import { canManageMembers } from "@/server/permissions";
import {
  githubConfig,
  readInstallState,
  safeReturnPath,
} from "@/server/github/security";

// GitHub redirects here after the app is installed. The installation is only
// linked to a workspace when (1) the signed state matches the signed-in user
// and a workspace they administer, and (2) GitHub confirms, using the user's
// own authorisation, that they can access this installation.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = readInstallState(url.searchParams.get("state"));
  // A verified state may ask to return somewhere else in the app.
  const target = safeReturnPath(state?.returnTo) ?? "/app/github";
  const back = (query: string) =>
    NextResponse.redirect(
      new URL(
        `${target}${target.includes("?") ? "&" : "?"}${query}`,
        url.origin,
      ),
    );

  const user = await currentUser();
  if (!user)
    return NextResponse.redirect(
      new URL(
        `/login?next=${encodeURIComponent(url.pathname + url.search)}`,
        url.origin,
      ),
    );

  const installationId = Number(url.searchParams.get("installation_id"));
  const code = url.searchParams.get("code");
  if (!Number.isSafeInteger(installationId) || installationId <= 0 || !code)
    return back("error=missing");
  if (!state || state.userId !== user.id) return back("error=state");

  const member = await workspaceAccess(state.workspaceId, user.id).catch(
    () => null,
  );
  if (!member || !canManageMembers(member.role))
    return back("error=permission");

  const { clientId, clientSecret } = githubConfig();
  if (!clientId || !clientSecret) return back("error=config");

  const verified = await verifyInstallationAccess(
    code,
    installationId,
    clientId,
    clientSecret,
  );
  if (!verified) return back("error=ownership");

  const [existing] = await db
    .select({ workspaceId: githubInstallations.workspaceId })
    .from(githubInstallations)
    .where(eq(githubInstallations.installationId, installationId));
  if (existing?.workspaceId && existing.workspaceId !== state.workspaceId)
    return back("error=taken");

  await db
    .insert(githubInstallations)
    .values({
      installationId,
      accountLogin: verified.login,
      accountType: verified.type,
      workspaceId: state.workspaceId,
      connectedBy: user.id,
    })
    .onConflictDoUpdate({
      target: githubInstallations.installationId,
      set: {
        workspaceId: state.workspaceId,
        connectedBy: user.id,
        accountLogin: verified.login,
        accountType: verified.type,
        deletedAt: null,
        updatedAt: new Date(),
      },
    });
  return back("connected=1");
}

async function verifyInstallationAccess(
  code: string,
  installationId: number,
  clientId: string,
  clientSecret: string,
) {
  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      },
    );
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) return null;
    const listResponse = await fetch(
      "https://api.github.com/user/installations?per_page=100",
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token.access_token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!listResponse.ok) return null;
    const list = (await listResponse.json()) as {
      installations?: {
        id: number;
        account: { login: string; type: string };
      }[];
    };
    const match = list.installations?.find((i) => i.id === installationId);
    return match
      ? { login: match.account.login, type: match.account.type }
      : null;
  } catch {
    return null;
  }
}
