import { can } from "$lib/rbac/access";
import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { selectSuppliers, supplierActions } from "./actions.server";

/**
 * The businesses the office buys from, picked on the fuel and paper POs.
 * Under the purchase order keys, so only GSU and the system administrator
 * see it. Every supplier comes with the page, archived ones included, so the
 * tabs and the search work without asking the server again, as on the
 * assets page.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "purchase_orders:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const suppliers = [
    ...(await selectSuppliers("active")),
    ...(await selectSuppliers("archived")),
  ].sort((a, b) => a.supplierName.localeCompare(b.supplierName));

  return { suppliers };
};

export const actions: Actions = supplierActions;
