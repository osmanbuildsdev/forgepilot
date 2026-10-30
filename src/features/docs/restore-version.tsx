"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { restoreVersion } from "@/server/docs/actions";
import { unwrap, errorMessage } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

export function RestoreVersion({
  projectId,
  documentId,
  versionNumber,
  baseVersion,
}: {
  projectId: string;
  documentId: string;
  versionNumber: number;
  baseVersion: number;
}) {
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
        onClick={async () => {
          if (
            !window.confirm(
              `Sürüm ${versionNumber} geri yüklensin mi? Mevcut içerik yeni bir sürüm olarak korunur.`,
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            const next = await restoreVersion(projectId, documentId, {
              versionNumber,
              baseVersion,
            }).then(unwrap);
            router.push(
              `/app/projects/${projectId}/docs/${documentId}/history?v=${next}`,
            );
            router.refresh();
          } catch (e) {
            setError(errorMessage(e, "Geri yüklenemedi."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <RotateCcw size={13} /> Bu sürümü geri yükle
      </Button>
    </span>
  );
}
