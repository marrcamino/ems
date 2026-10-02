import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Asset types used to have this page of their own. They are now managed in a
// dialog on the assets page, and this address sends old bookmarks there.
export const GET: RequestHandler = () => {
  redirect(308, "/admin/fuel/assets?asset-types");
};
