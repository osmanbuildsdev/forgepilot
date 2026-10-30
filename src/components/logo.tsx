import { Hexagon } from "lucide-react";
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">
        <Hexagon size={23} strokeWidth={2.3} />
      </span>
      ForgePilot<span className="logo-dot">.</span>
    </span>
  );
}
