import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { documentTemplates } from "@/server/db/schema";
import { requireUser, workspaceAccess } from "@/server/projects/service";
import { canWrite } from "@/server/permissions";
import { TemplateEditor } from "@/features/docs/template-editor";

export const metadata: Metadata = { title: "Şablonu düzenle" };

export default async function Page({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  if (!z.uuid().safeParse(templateId).success) notFound();
  const user = await requireUser();
  const [template] = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.id, templateId));
  if (!template) notFound();
  const me = await workspaceAccess(template.workspaceId, user.id).catch(
    () => null,
  );
  if (!me) notFound();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link
        href="/app/docs/templates"
        className="row subtle"
        style={{ gap: 6, fontSize: 13 }}
      >
        <ArrowLeft size={14} /> Şablonlar
      </Link>
      <TemplateEditor
        template={{
          id: template.id,
          name: template.name,
          description: template.description,
          content: template.contentMarkdown,
        }}
        canWrite={canWrite(me.role)}
      />
    </div>
  );
}
