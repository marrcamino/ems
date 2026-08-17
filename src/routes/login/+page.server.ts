// src/rotues/+page.server.ts
import { verifyPassword } from "$lib/server/auth/password";
import {
  getAlreadyLoggedInRedirect,
  getDefaultLandingRoute,
  getSafeRedirectTarget,
} from "$lib/server/auth/redirect";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "$lib/server/auth/session";
import { db } from "$lib/server/db";
import { permission, rolePermission, user } from "$lib/server/db/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) {
    const fallback = getDefaultLandingRoute(locals.permissions);
    const target = getAlreadyLoggedInRedirect(
      !!locals.user,
      url.searchParams.get("redirectTo"),
      fallback,
    );
    throw redirect(302, target || fallback);
  }
};

export const actions: Actions = {
  login: async (event) => {
    const form = await event.request.formData();
    const username = form.get("username");
    const password = form.get("password");

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username ||
      !password
    ) {
      return fail(400, { error: "Username and password are required." });
    }

    const [found] = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    // Same generic error for "no such user" and "wrong password" — don't leak which one
    if (!found) {
      return fail(400, { error: "Invalid username or password." });
    }

    if (found.status !== "active") {
      return fail(403, {
        error: "This account is inactive. Contact your administrator.",
      });
    }

    if (found.lockedUntil && found.lockedUntil.getTime() > Date.now()) {
      return fail(403, {
        error:
          "Account temporarily locked due to failed attempts. Try again later.",
      });
    }

    const valid = await verifyPassword(password, found.passwordHash);

    if (!valid) {
      const attempts = found.failedLoginAttempts + 1;

      const locked = attempts >= MAX_FAILED_ATTEMPTS;

      await db
        .update(user)
        .set({
          failedLoginAttempts: locked ? 0 : attempts,
          lockedUntil: locked
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
        })
        .where(eq(user.userPk, found.userPk));

      return fail(400, { error: "Invalid username or passwordss." });
    }

    await db
      .update(user)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(user.userPk, found.userPk));

    const token = generateSessionToken();
    const { expiresAt } = await createSession(token, found.userPk);
    setSessionTokenCookie(event, token, expiresAt);

    // must-change-password takes priority over everything else below —
    // don't send them to /admin or back to redirectTo before this is done
    if (found.mustChangePassword) throw redirect(302, "/change-password");

    // look up this user's permissions fresh from the DB, since
    // event.locals.permissions is stale (hooks ran before this session existed)
    const perms = await db
      .select({ key: permission.key })
      .from(rolePermission)
      .innerJoin(
        permission,
        eq(rolePermission.permissionFk, permission.permissionPk),
      )
      .where(eq(rolePermission.roleFk, found.roleFk));

    const permissionKeys = new Set(perms.map((p) => p.key));

    const fallback = getDefaultLandingRoute(permissionKeys);
    const redirectTarget = getSafeRedirectTarget(
      event.url.searchParams.get("redirectTo"),
      fallback,
    );
    throw redirect(302, redirectTarget);
  },
};
