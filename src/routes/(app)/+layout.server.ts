import { getSessionData } from "$lib/server/session-data";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  return getSessionData(locals);
};
