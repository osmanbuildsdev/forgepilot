// Server actions return this instead of throwing, because Next.js replaces
// thrown error messages with a generic one in production builds.
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; error: string };

// The success payload of a server action, e.g. ActionData<typeof listComments>.
export type ActionData<
  F extends (...args: never[]) => Promise<ActionResult<unknown>>,
> = Extract<Awaited<ReturnType<F>>, { ok: true }>["data"];

// A failure reported by the server with a message meant for the user.
export class ActionError extends Error {}

export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new ActionError(result.error);
  return result.data;
}

// Shows the server's message when there is one; network failures and other
// unexpected errors fall back to a fixed, localised message.
export function errorMessage(
  error: unknown,
  fallback = "İşlem tamamlanamadı. Bağlantını kontrol edip tekrar dene.",
) {
  return error instanceof ActionError ? error.message : fallback;
}
