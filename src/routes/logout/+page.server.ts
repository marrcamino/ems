import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  invalidateSession,
  deleteSessionTokenCookie,
} from "$lib/server/auth/session";

export const load: PageServerLoad = async (event) => {
  // no session at all? nothing to log out of
  if (!event.locals.session) {
    throw redirect(302, "/login");
  }
};

export const actions: Actions = {
  default: async (event) => {
    if (!event.locals.session) {
      return fail(401);
    }

    await invalidateSession(event.locals.session.sessionPk);
    deleteSessionTokenCookie(event);

    throw redirect(302, "/login");
  },
};
