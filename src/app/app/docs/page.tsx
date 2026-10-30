import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LayoutTemplate } from "lucide-react";
import { requireUser } from "@/server/projects/service";
import { userDocuments } from "@/server/docs/queries";
import { DocsBrowser } from "@/features/docs/docs-browser";

export const metadata: Metadata = { title: "Dokümanlar" };

export default async function Page() {
  const user = await requireUser();
  const items = await userDocuments(user.id);
  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <h1>Dokümanlar</h1>
          <p className="muted">
            Tüm projelerdeki gereksinimler, mimari notları ve kararlar. Doküman
            eklemek için bir projenin Dokümanlar sekmesini kullan.
          </p>
        </div>
        <Link href="/app/docs/templates" className="button outline">
          <LayoutTemplate size={15} /> Şablonlar
        </Link>
      </header>
      {items.length ? (
        <DocsBrowser items={items} />
      ) : (
        <div className="empty">
          <FileText size={22} />
          <h2>Henüz doküman yok.</h2>
          <p className="muted">
            Bir projeye girip Markdown dosyası yükleyerek ya da yeni doküman
            yazarak başla.
          </p>
        </div>
      )}
    </div>
  );
}
