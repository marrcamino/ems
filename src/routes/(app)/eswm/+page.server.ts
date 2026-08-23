import { can } from "$lib/rbac/access";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "eswm:view")) {
    throw error(403, "You do not have permission to view this page.");
  }
};
