import "server-only";
import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";

// An error whose message is safe and meant to be shown to the user.
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

const GENERIC = "Beklenmeyen bir hata oluştu. Lütfen tekrar dene.";

export async function attempt<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    // Redirects and notFound() are control flow and must reach Next.js.
    unstable_rethrow(error);
    if (error instanceof UserError) return { ok: false, error: error.message };
    if (error instanceof z.ZodError) {
      // Custom messages are written in Turkish; built-in ones are not shown.
      const custom = error.issues.find((i) => i.code === "custom")?.message;
      return {
        ok: false,
        error: custom ?? "Girilen bilgiler geçersiz. Alanları kontrol et.",
      };
    }
    console.error(error);
    return { ok: false, error: GENERIC };
  }
}
