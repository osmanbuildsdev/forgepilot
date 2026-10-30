"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/server/workspaces/actions";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="stack" style={{ marginTop: 20 }}>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await acceptInvite(token);
            router.push("/app");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Davet kabul edilemedi.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Katılınıyor…" : "Daveti kabul et"}
      </Button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
