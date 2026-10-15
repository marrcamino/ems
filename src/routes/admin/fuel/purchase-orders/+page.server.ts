import { can } from "$lib/rbac/access";
import { error } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  purchaseOrderActions,
  selectPurchaseOrders,
  selectUnitOptions,
} from "./po-actions.server";
import { selectSuppliers, supplierActions } from "./suppliers/actions.server";

export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "admin:view_purchase_orders")) {
    throw error(403, "You do not have permission to view this page.");
  }

  // Active suppliers only: they are what a new PO picks from. Nothing about
  // archived suppliers, not even how many there are, is read here; the
  // suppliers dialog fetches them when Archived or All is picked.
  const [suppliers, purchaseOrders, unitOptions] = await Promise.all([
    selectSuppliers("active"),
    selectPurchaseOrders(),
    selectUnitOptions(),
  ]);

  return { suppliers, purchaseOrders, unitOptions };
};

export const actions: Actions = {
  ...supplierActions,
  ...purchaseOrderActions,
};
