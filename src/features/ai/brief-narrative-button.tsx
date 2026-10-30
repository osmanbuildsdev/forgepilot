"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { generateBriefNarrative } from "@/server/ai/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

export function BriefNarrativeButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="row" style={{ gap: 8 }}>
      {error && (
        <span className="error" role="alert" style={{ fontSize: 12 }}>
          {error}
        </span>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        title="Günde bir kez üretilir ve gün boyunca tekrar kullanılır."
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await generateBriefNarrative().then(unwrap);
            router.refresh();
          } catch (e) {
            setError(errorMessage(e, "Özet oluşturulamadı."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles size={13} />
        {busy ? "Hazırlanıyor…" : "AI ile özetle"}
      </Button>
    </span>
  );
}
