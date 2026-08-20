import type { SessionUser } from "$lib/types";

export function getSessionData(locals: App.Locals) {
  return {
    user: locals.user as SessionUser, // safe: guardOrResolve() already redirected unauthenticated users before (app)/admin are reached
    permissions: Array.from(locals.permissions),
  };
}
