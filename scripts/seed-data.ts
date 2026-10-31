// Development demo data. Everything lives in a workspace whose name marks it
// as sample data, no GitHub activity is invented, and no passwords are
// created: the owner is an account registered through the app, and the
// teammates below cannot sign in.
import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../src/server/db/schema";
import { parseMarkdown } from "../src/features/docs/markdown";

export const DEMO_WORKSPACE = "Acme Labs · Örnek";

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
type Status = "backlog" | "todo" | "in_progress" | "review" | "done";
type Priority = "low" | "medium" | "high" | "urgent";

// Dates are relative to today so sprints, deadlines and health stay meaningful.
const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const at = (offset: number) =>
  new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

const teammates = [
  {
    id: "demo-deniz",
    name: "Deniz Kaya",
    email: "deniz@example.com",
    role: "member" as const,
  },
  {
    id: "demo-ece",
    name: "Ece Yılmaz",
    email: "ece@example.com",
    role: "member" as const,
  },
  {
    id: "demo-mert",
    name: "Mert Arslan",
    email: "mert@example.com",
    role: "viewer" as const,
  },
];

const architecture = `# Mimari notlar

## Genel bakış

Mobil istemci REST API üzerinden çalışır; kimlik doğrulama JWT ve yenileme token'ı ile yapılır.

## Kimlik doğrulama

- Giriş: FORGE-21
- Yenileme token'ı testleri henüz yazılmadı.

## Veri modeli

| Varlık | Not |
|---|---|
| Proje | Anahtar (FORGE) görev numaralarında kullanılır |
| Görev | Durum, öncelik, sprint ve milestone bağlantıları |

## Açık sorular

- [ ] Çevrimdışı mod kapsamda mı?
- [x] Push bildirimleri ikinci aşamaya kaldı.
`;

export async function seedDemo(db: Db, ownerId: string) {
  const existing = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .innerJoin(
      schema.members,
      eq(schema.members.workspaceId, schema.workspaces.id),
    )
    .where(
      and(
        eq(schema.members.userId, ownerId),
        eq(schema.workspaces.name, DEMO_WORKSPACE),
      ),
    );
  if (existing.length) return { created: false as const };

  return db.transaction(async (tx) => {
    await tx
      .insert(schema.user)
      .values(teammates.map(({ id, name, email }) => ({ id, name, email })))
      .onConflictDoNothing();
    const [workspace] = await tx
      .insert(schema.workspaces)
      .values({ name: DEMO_WORKSPACE })
      .returning();
    await tx.insert(schema.members).values([
      { workspaceId: workspace.id, userId: ownerId, role: "owner" },
      ...teammates.map((t) => ({
        workspaceId: workspace.id,
        userId: t.id,
        role: t.role,
      })),
    ]);

    // --- ForgePilot Mobile -------------------------------------------------
    const [forge, atlas] = await tx
      .insert(schema.projects)
      .values([
        {
          workspaceId: workspace.id,
          name: "ForgePilot Mobile",
          key: "FORGE",
          description:
            "Ekiplerin görevlerini telefondan takip edebileceği mobil uygulama. (Örnek veri)",
          createdBy: ownerId,
          nextTaskNumber: 25,
        },
        {
          workspaceId: workspace.id,
          name: "Atlas Analytics",
          key: "ATLAS",
          description:
            "Ürün kullanım verileri için iç analitik paneli. (Örnek veri)",
          createdBy: ownerId,
          nextTaskNumber: 5,
        },
      ])
      .returning();

    const [alpha, beta, launch] = await tx
      .insert(schema.milestones)
      .values([
        {
          projectId: forge.id,
          name: "Alfa",
          description: "İç ekip kullanımı",
          dueDate: day(-10),
        },
        {
          projectId: forge.id,
          name: "Beta",
          description: "İlk 20 dış kullanıcı",
          dueDate: day(14),
        },
        {
          projectId: forge.id,
          name: "Genel sürüm",
          description: "Mağazalarda yayın",
          dueDate: day(45),
        },
      ])
      .returning();
    const [sprint3, sprint4, sprint5] = await tx
      .insert(schema.sprints)
      .values([
        {
          projectId: forge.id,
          name: "Sprint 3",
          goal: "Giriş ve proje listesi",
          startDate: day(-19),
          endDate: day(-6),
          status: "completed",
          committedPoints: 21,
          completedPoints: 18,
          completedTasks: 4,
          retrospective: "Tahminler iyiydi; API sözleşmesi geç netleşti.",
          completedAt: at(-6),
        },
        {
          projectId: forge.id,
          name: "Sprint 4",
          goal: "Görev panosu ve onboarding",
          startDate: day(-5),
          endDate: day(8),
          status: "active",
        },
        {
          projectId: forge.id,
          name: "Sprint 5",
          goal: "Beta hazırlığı",
          startDate: day(9),
          endDate: day(22),
        },
      ])
      .returning();
    const labels = await tx
      .insert(schema.labels)
      .values([
        { projectId: forge.id, name: "backend", color: "#2563eb" },
        { projectId: forge.id, name: "mobil", color: "#16a34a" },
        { projectId: forge.id, name: "auth", color: "#c2410c" },
      ])
      .returning();
    const label = (name: string) => labels.find((l) => l.name === name)!.id;

    type Row = {
      number: number;
      title: string;
      status: Status;
      priority: Priority;
      assignee?: string;
      points?: number;
      due?: number;
      sprint?: string;
      milestone?: string;
      labels?: string[];
      doneDaysAgo?: number;
      description?: string;
    };
    const rows: Row[] = [
      {
        number: 16,
        title: "Proje listeleme ekranı",
        status: "done",
        priority: "medium",
        assignee: "demo-ece",
        points: 5,
        sprint: sprint3.id,
        milestone: alpha.id,
        labels: ["mobil"],
        doneDaysAgo: 8,
      },
      {
        number: 17,
        title: "API istemcisi ve hata yönetimi",
        status: "done",
        priority: "high",
        assignee: "demo-deniz",
        points: 5,
        sprint: sprint3.id,
        milestone: alpha.id,
        labels: ["backend"],
        doneDaysAgo: 9,
      },
      {
        number: 18,
        title: "Giriş ekranı tasarımı",
        status: "done",
        priority: "medium",
        assignee: "demo-ece",
        points: 3,
        sprint: sprint3.id,
        milestone: alpha.id,
        labels: ["mobil", "auth"],
        doneDaysAgo: 12,
      },
      {
        number: 19,
        title: "Oturum süresi dolunca yeniden giriş",
        status: "done",
        priority: "high",
        assignee: "demo-deniz",
        points: 5,
        sprint: sprint3.id,
        milestone: alpha.id,
        labels: ["auth"],
        doneDaysAgo: 1,
      },
      {
        number: 20,
        title: "Hata izleme entegrasyonu",
        status: "backlog",
        priority: "low",
        points: 3,
        labels: ["backend"],
      },
      {
        number: 21,
        title: "Kimlik doğrulama API'si",
        status: "in_progress",
        priority: "urgent",
        assignee: "demo-deniz",
        points: 8,
        due: 2,
        sprint: sprint4.id,
        milestone: beta.id,
        labels: ["backend", "auth"],
        description:
          "Kabul kriterleri:\n- E-posta ve parola ile giriş\n- Yenileme token'ı\n- Hatalı girişte anlaşılır mesaj",
      },
      {
        number: 22,
        title: "Onboarding akışı",
        status: "review",
        priority: "high",
        assignee: "demo-ece",
        points: 5,
        due: -1,
        sprint: sprint4.id,
        milestone: beta.id,
        labels: ["mobil"],
      },
      {
        number: 23,
        title: "GitHub App yapılandırması",
        status: "todo",
        priority: "medium",
        assignee: ownerId,
        points: 3,
        due: 6,
        sprint: sprint4.id,
        milestone: beta.id,
        labels: ["backend"],
      },
      {
        number: 24,
        title: "Proje panosu",
        status: "in_progress",
        priority: "high",
        assignee: "demo-ece",
        points: 8,
        due: 5,
        sprint: sprint4.id,
        milestone: beta.id,
        labels: ["mobil"],
      },
      {
        number: 25,
        title: "Görev bağımlılık sistemi",
        status: "todo",
        priority: "medium",
        points: 5,
        sprint: sprint5.id,
        milestone: beta.id,
        labels: ["backend"],
      },
      {
        number: 15,
        title: "Mağaza görselleri ve açıklamalar",
        status: "backlog",
        priority: "low",
        milestone: launch.id,
      },
      {
        number: 14,
        title: "Erişilebilirlik denetimi",
        status: "backlog",
        priority: "medium",
        points: 3,
        milestone: launch.id,
        labels: ["mobil"],
      },
    ];
    const created = await tx
      .insert(schema.tasks)
      .values(
        rows.map((r) => ({
          projectId: forge.id,
          number: r.number,
          title: r.title,
          description: r.description ?? "",
          status: r.status,
          priority: r.priority,
          assigneeId: r.assignee ?? null,
          estimatePoints: r.points ?? null,
          dueDate: r.due === undefined ? null : day(r.due),
          sprintId: r.sprint ?? null,
          milestoneId: r.milestone ?? null,
          completedAt: r.doneDaysAgo === undefined ? null : at(-r.doneDaysAgo),
          createdBy: ownerId,
          createdAt: at(-25),
        })),
      )
      .returning({ id: schema.tasks.id, number: schema.tasks.number });
    const task = (n: number) => created.find((t) => t.number === n)!.id;

    await tx.insert(schema.taskLabels).values(
      rows.flatMap((r) =>
        (r.labels ?? []).map((name) => ({
          taskId: task(r.number),
          labelId: label(name),
        })),
      ),
    );
    await tx.insert(schema.taskDependencies).values([
      { taskId: task(25), dependsOnId: task(21) },
      { taskId: task(23), dependsOnId: task(21) },
    ]);
    await tx.insert(schema.subtasks).values([
      { taskId: task(21), title: "Giriş uç noktası", done: true, position: 0 },
      { taskId: task(21), title: "Yenileme token'ı", done: false, position: 1 },
      {
        taskId: task(21),
        title: "Yenileme token'ı testleri",
        done: false,
        position: 2,
      },
    ]);
    await tx.insert(schema.taskComments).values([
      {
        taskId: task(21),
        authorId: "demo-deniz",
        body: "Giriş uç noktası hazır; yenileme token'ına geçiyorum.",
      },
      {
        taskId: task(22),
        authorId: "demo-ece",
        body: "İncelemeye aldım; ekran görüntüleri yorumlara eklenecek.",
      },
    ]);
    await tx.insert(schema.documents).values({
      workspaceId: workspace.id,
      projectId: forge.id,
      title: "Mimari notlar",
      contentMarkdown: architecture,
      structure: parseMarkdown(architecture),
      createdBy: ownerId,
      updatedBy: ownerId,
    });
    const [doc] = await tx
      .select({ id: schema.documents.id })
      .from(schema.documents)
      .where(eq(schema.documents.projectId, forge.id));
    await tx.insert(schema.documentVersions).values({
      documentId: doc.id,
      versionNumber: 1,
      title: "Mimari notlar",
      contentMarkdown: architecture,
      note: "Örnek veri",
      createdBy: ownerId,
    });

    // --- Atlas Analytics ---------------------------------------------------
    await tx.insert(schema.tasks).values(
      (
        [
          [1, "Olay toplama şeması", "done", "high", "demo-deniz", 3],
          [
            2,
            "Günlük aktif kullanıcı grafiği",
            "in_progress",
            "medium",
            "demo-ece",
            5,
          ],
          [3, "Dışa aktarma (CSV)", "todo", "low", null, 2],
          [4, "Yetki kontrolleri", "todo", "high", "demo-deniz", 5],
          [5, "Panel yükleme süresini iyileştir", "backlog", "medium", null, 3],
        ] as const
      ).map(([number, title, status, priority, assignee, points]) => ({
        projectId: atlas.id,
        number,
        title,
        status,
        priority,
        assigneeId: assignee,
        estimatePoints: points,
        completedAt: status === "done" ? at(-3) : null,
        createdBy: ownerId,
      })),
    );

    await tx.insert(schema.activities).values(
      [forge.id, atlas.id].map((projectId) => ({
        projectId,
        type: "project.note" as const,
        source: "system" as const,
        message: "Geliştirme örnek verileri seed komutuyla oluşturuldu.",
      })),
    );
    return {
      created: true as const,
      workspaceId: workspace.id,
      projectIds: [forge.id, atlas.id],
    };
  });
}
