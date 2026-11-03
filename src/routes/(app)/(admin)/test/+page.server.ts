import { can } from "$lib/rbac/access";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/**
 * A page for trying things out. Only the super-admin role holds
 * `roles:view`, so this key keeps the page to the super-admin.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "roles:view")) {
    throw error(403, "You do not have permission to view this page.");
  }
};
