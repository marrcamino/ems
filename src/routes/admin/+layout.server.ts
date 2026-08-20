import { error } from "@sveltejs/kit";
import { can } from "$lib/rbac/access";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "admin:view")) {
    throw error(403, "You do not have permission to view this page.");
  }
};
