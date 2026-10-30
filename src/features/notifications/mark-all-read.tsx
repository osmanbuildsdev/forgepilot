"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "@/server/notifications/actions";
import { unwrap } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await markAllNotificationsRead()
          .then(unwrap)
          .catch(() => {});
        router.refresh();
        setBusy(false);
      }}
    >
      Tümünü okundu işaretle
    </Button>
  );
}
