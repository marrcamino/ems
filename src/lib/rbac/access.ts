// src/lib/rbac/access.ts
import type { PermissionKey } from "$lib/server/permissions";

export function can(permissions: Set<string>, key: PermissionKey): boolean {
  return permissions.has(key);
}

export function canAll(
  permissions: Set<string>,
  keys: PermissionKey[],
): boolean {
  return keys.every((key) => permissions.has(key));
}

export function canAny(
  permissions: Set<string>,
  keys: PermissionKey[],
): boolean {
  return keys.some((key) => permissions.has(key));
}

export function canModule(permissions: Set<string>, module: string): boolean {
  const prefix = `${module}:`;
  for (const key of permissions) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

export function createAccess(permissions: Set<string>) {
  return {
    can: (key: PermissionKey) => can(permissions, key),
    canAll: (keys: PermissionKey[]) => canAll(permissions, keys),
    canAny: (keys: PermissionKey[]) => canAny(permissions, keys),
    canModule: (module: string) => canModule(permissions, module),
  };
}
