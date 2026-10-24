import { can } from "$lib/rbac/access";
import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { selectSuppliers } from "./actions.server";

/**
 * The suppliers with one status, `?status=archived` or `?status=active`.
 *
 * The page loads only the active ones. The suppliers dialog fetches the
 * archived ones from here the first time it is switched to Archived or All,
 * since the archive only grows and most visits never look at it.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!can(locals.permissions, "purchase_orders:view")) {
    throw error(403, "You do not have permission to view this.");
  }

  const status = url.searchParams.get("status");
  if (status !== "active" && status !== "archived") {
    throw error(400, "Ask for active or archived suppliers.");
  }

  return json({ suppliers: await selectSuppliers(status) });
};
