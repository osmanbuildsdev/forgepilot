import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleDashed } from "lucide-react";
import { requireUser } from "@/server/projects/service";
import { githubAppConfigured } from "@/server/github/security";
import { workspaceGithub } from "@/server/github/queries";

export const metadata: Metadata = { title: "Entegrasyonlar" };

function Status({ on }: { on: boolean }) {
  return on ? (
    <span className="badge live">
      <CircleCheck size={12} /> Etkin
    </span>
  ) : (
    <span className="badge">
      <CircleDashed size={12} /> Yapılandırılmamış
    </span>
  );
}

export default async function Page() {
  const user = await requireUser();
  const installations = await workspaceGithub(user.id);
  const repos = installations.reduce((n, i) => n + i.repositories.length, 0);
  const rows = [
    {
      name: "GitHub",
      on: githubAppConfigured(),
      detail: githubAppConfigured()
        ? `${installations.length} bağlı hesap, ${repos} repo.`
        : "Sunucuda GitHub App bilgileri tanımlı değil.",
      link: { href: "/app/github", label: "GitHub sayfası" },
    },
    {
      name: "Gemini (AI)",
      on: Boolean(process.env.GEMINI_API_KEY),
      detail: `Model: ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}. Proje üretici, Copilot, doküman AI ve özetler bunu kullanır.`,
      link: { href: "/app/settings/ai", label: "AI kullanımı" },
    },
    {
      name: "GitHub ile giriş",
      on: Boolean(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
      ),
      detail: "Giriş ve kayıt sayfalarında GitHub düğmesi.",
    },
    {
      name: "Google ile giriş",
      on: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
      detail: "Giriş ve kayıt sayfalarında Google düğmesi.",
    },
    {
      name: "Arka plan kuyruğu (Redis)",
      on: Boolean(process.env.REDIS_URL),
      detail: process.env.REDIS_URL
        ? "İşler BullMQ kuyruğuna gider; `npm run worker` çalışmalı."
        : "İşler istek sırasında çalışır. Zamanlanmış hatırlatmalar için Redis veya cron gerekir.",
    },
    {
      name: "Zamanlanmış işler (cron)",
      on: Boolean(process.env.CRON_SECRET),
      detail: "Redis olmadan hatırlatmalar için /api/cron/<iş> ucu.",
    },
  ];
  return (
    <section className="panel">
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        Entegrasyonlar sunucu ortam değişkenleriyle açılır; anahtarlar
        tarayıcıya hiçbir zaman gönderilmez.
      </p>
      <ul className="sprint-list">
        {rows.map((r) => (
          <li key={r.name} style={{ alignItems: "flex-start" }}>
            <span style={{ minWidth: 0 }}>
              <strong>{r.name}</strong>
              <span
                className="subtle"
                style={{ display: "block", fontSize: 12 }}
              >
                {r.detail}{" "}
                {r.link && (
                  <Link className="text-link" href={r.link.href}>
                    {r.link.label}
                  </Link>
                )}
              </span>
            </span>
            <Status on={r.on} />
          </li>
        ))}
      </ul>
    </section>
  );
}
