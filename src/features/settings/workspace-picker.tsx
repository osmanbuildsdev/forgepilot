import Link from "next/link";

// Switches between the user's workspaces via ?workspace=, keeping the page.
export function WorkspacePicker({
  base,
  workspaces,
  current,
}: {
  base: string;
  workspaces: { id: string; name: string }[];
  current: string;
}) {
  if (workspaces.length < 2) return null;
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {workspaces.map((w) => (
        <Link
          key={w.id}
          href={`${base}?workspace=${w.id}`}
          className={`badge ${w.id === current ? "accent" : ""}`}
          aria-current={w.id === current ? "true" : undefined}
        >
          {w.name}
        </Link>
      ))}
    </div>
  );
}
