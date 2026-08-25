import { page } from "$app/state";
import { can, canAll, canAny, canModule } from "$lib/rbac/access";
import type { PermissionKey } from "$lib/server/permissions";
import type { SessionUser } from "$lib/types";
import { makeContext } from "$lib/utils";

class GlobalContext {
  // Cast: only ever set in (app)/admin layouts, where getSessionData()
  // guarantees both fields are present — (auth) routes never set this context.
  user = $derived(page.data.user as SessionUser);
  permissions = $derived(new Set<string>(page.data.permissions as string[]));

  can = (key: PermissionKey) => can(this.permissions, key);
  canAll = (keys: PermissionKey[]) => canAll(this.permissions, keys);
  canAny = (keys: PermissionKey[]) => canAny(this.permissions, keys);
  canModule = (module: string) => canModule(this.permissions, module);
}

export const { set: setGlobalContext, get: getGlobalContext } = makeContext(
  "global-context",
  GlobalContext,
);
