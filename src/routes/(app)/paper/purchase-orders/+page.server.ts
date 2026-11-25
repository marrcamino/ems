import { can } from "$lib/rbac/access";
import { selectSuppliers } from "../../suppliers/actions.server";
import { error } from "@sveltejs/kit";
import { selectUnitOptions } from "../../fuel/purchase-orders/po-actions.server";
import type { Actions, PageServerLoad } from "./$types";
import {
  paperPurchaseOrderActions,
  selectPaperPurchaseOrders,
} from "./paper-po-actions.server";

/**
 * GSU's paper POs, as COA forwards them, and the reams of each that GSU gave
 * each office. The same keys as the fuel POs.
 */
export const load: PageServerLoad = async ({ locals }) => {
  if (!can(locals.permissions, "purchase_orders:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const [suppliers, purchaseOrders, units] = await Promise.all([
    selectSuppliers("active"),
    selectPaperPurchaseOrders(),
    selectUnitOptions(),
  ]);

  return {
    suppliers,
    purchaseOrders,
    offices: units.map(({ orgUnitPk, orgUnitName, abbr }) => ({
      orgUnitPk,
      orgUnitName,
      abbr,
    })),
  };
};

export const actions: Actions = paperPurchaseOrderActions;
