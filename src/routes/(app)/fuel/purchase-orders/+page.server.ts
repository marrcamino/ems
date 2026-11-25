import { can } from "$lib/rbac/access";
import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  purchaseOrderActions,
  selectPurchaseOrders,
  selectUnitOptions,
} from "./po-actions.server";
import { selectSuppliers } from "../../suppliers/actions.server";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "purchase_orders:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  // Active suppliers only: they are what a new PO picks from. Suppliers are
  // managed on their own page.
  const [suppliers, purchaseOrders, unitOptions] = await Promise.all([
    selectSuppliers("active"),
    selectPurchaseOrders(),
    selectUnitOptions(),
  ]);

  return { suppliers, purchaseOrders, unitOptions };
};

export const actions: Actions = {
  ...purchaseOrderActions,
};
