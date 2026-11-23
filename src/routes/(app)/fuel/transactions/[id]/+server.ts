import { can } from "$lib/rbac/access";
import { error, json } from "@sveltejs/kit";
import { selectTransactionDetails } from "../../issuance.server";
import type { RequestHandler } from "./$types";

/**
 * A saved withdrawal or trip, for the Edit and Complete forms on the Fuel
 * page, which open it from the list.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!can(locals.permissions, "fuel:view")) {
    throw error(403, "You do not have permission to view this.");
  }
  const details = await selectTransactionDetails(Number(params.id), locals);
  if (!details) throw error(404, "This record is no longer on the list.");
  return json(details);
};
