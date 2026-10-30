// Project health is computed from project data with fixed, documented rules.
// AI may explain the result but never produces the number.

export type HealthInput = {
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  unassignedUrgent: number;
  activeSprint: {
    name: string;
    timePct: number;
    workPct: number;
    tasks: number;
  } | null;
  overdueMilestones: string[];
  // Open task counts per assignee, unassigned work excluded.
  openByAssignee: number[];
};

export type HealthLevel = "healthy" | "warning" | "risk";

export type HealthFactor = {
  key:
    "overdue" | "blocked" | "sprint" | "milestones" | "workload" | "unassigned";
  label: string;
  level: HealthLevel;
  penalty: number;
  detail: string;
};

export type Health = {
  score: number;
  level: HealthLevel;
  factors: HealthFactor[];
};

const cap = (value: number, max: number) => Math.min(Math.round(value), max);
const levelOf = (penalty: number, warnAt: number, riskAt: number) =>
  penalty >= riskAt ? "risk" : penalty >= warnAt ? "warning" : "healthy";

export function computeHealth(input: HealthInput): Health {
  const factors: HealthFactor[] = [];

  const overdue = cap(input.overdueTasks * 4, 25);
  factors.push({
    key: "overdue",
    label: "Geciken görevler",
    penalty: overdue,
    level: levelOf(overdue, 4, 16),
    detail: input.overdueTasks
      ? `${input.overdueTasks} görevin son tarihi geçti.`
      : "Son tarihi geçmiş açık görev yok.",
  });

  const blocked = cap(input.blockedTasks * 3, 15);
  factors.push({
    key: "blocked",
    label: "Engelli görevler",
    penalty: blocked,
    level: levelOf(blocked, 3, 9),
    detail: input.blockedTasks
      ? `${input.blockedTasks} görev bitmemiş başka bir görevi bekliyor.`
      : "Bekleyen bağımlılık yok.",
  });

  // Behind when finished work trails elapsed time by more than 10 points.
  let sprint = 0;
  let sprintDetail = "Aktif sprint yok.";
  if (input.activeSprint) {
    const { name, timePct, workPct, tasks } = input.activeSprint;
    const gap = timePct - workPct;
    sprint = tasks > 0 && gap > 10 ? cap((gap - 10) * 0.6, 25) : 0;
    sprintDetail =
      tasks === 0
        ? `${name} aktif ama içinde görev yok.`
        : sprint
          ? `${name}: sürenin %${timePct}'i geçti, işin %${workPct}'i bitti.`
          : `${name} planlandığı gibi ilerliyor (%${workPct} tamamlandı).`;
  }
  factors.push({
    key: "sprint",
    label: "Sprint ilerlemesi",
    penalty: sprint,
    level: levelOf(sprint, 1, 12),
    detail: sprintDetail,
  });

  const milestones = cap(input.overdueMilestones.length * 8, 20);
  factors.push({
    key: "milestones",
    label: "Milestone'lar",
    penalty: milestones,
    level: levelOf(milestones, 8, 16),
    detail: input.overdueMilestones.length
      ? `Hedef tarihi geçen: ${input.overdueMilestones.slice(0, 3).join(", ")}.`
      : "Geciken milestone yok.",
  });

  // Imbalanced when one person holds more than twice the average and at
  // least five open tasks.
  const loads = input.openByAssignee.filter((n) => n > 0);
  const avg = loads.length
    ? loads.reduce((a, b) => a + b, 0) / loads.length
    : 0;
  const max = loads.length ? Math.max(...loads) : 0;
  const imbalanced = loads.length > 1 && max >= 5 && max > avg * 2;
  const workload = imbalanced ? 10 : 0;
  factors.push({
    key: "workload",
    label: "İş yükü dağılımı",
    penalty: workload,
    level: imbalanced ? "warning" : "healthy",
    detail: imbalanced
      ? `Bir kişide ${max} açık görev var; ortalama ${avg.toFixed(1)}.`
      : loads.length
        ? "İş yükü ekip içinde dengeli."
        : "Henüz kimseye görev atanmadı.",
  });

  const unassigned = cap(input.unassignedUrgent * 2, 10);
  factors.push({
    key: "unassigned",
    label: "Sahipsiz öncelikli işler",
    penalty: unassigned,
    level: levelOf(unassigned, 2, 6),
    detail: input.unassignedUrgent
      ? `${input.unassignedUrgent} yüksek/acil görev kimseye atanmamış.`
      : "Öncelikli görevlerin hepsinin sahibi var.",
  });

  const score = Math.max(0, 100 - factors.reduce((n, f) => n + f.penalty, 0));
  return {
    score,
    level: score >= 80 ? "healthy" : score >= 60 ? "warning" : "risk",
    factors,
  };
}
