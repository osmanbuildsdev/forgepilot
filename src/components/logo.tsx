export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor">
          <path d="M2.5 1.5h9v2.75H5.5v1.5h5v2.75h-5v4H2.5z" />
        </svg>
      </span>
      {!compact && "ForgePilot"}
    </span>
  );
}
