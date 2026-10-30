"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { resolveCompletionSuggestion } from "@/server/github/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

// "This task may be complete": a person confirms or dismisses it.
export function SuggestionButtons({
  projectId,
  linkId,
  onDone,
}: {
  projectId: string;
  linkId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "confirm" | "dismiss") {
    setBusy(true);
    setError("");
    try {
      await resolveCompletionSuggestion(projectId, linkId, decision).then(
        unwrap,
      );
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      <Button size="sm" disabled={busy} onClick={() => decide("confirm")}>
        <Check size={13} /> Tamamlandı olarak işaretle
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => decide("dismiss")}
      >
        Yoksay
      </Button>
      {error && (
        <span className="error" role="alert" style={{ fontSize: 12 }}>
          {error}
        </span>
      )}
    </span>
  );
}
