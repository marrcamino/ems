import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, url }) => {
  void url.pathname;
  return { user: locals.user, permissions: locals.permissions };
};
