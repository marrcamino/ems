// src/rotues/+page.server.ts
import { verifyPassword } from "$lib/server/auth/password";
import {
  buildChangePasswordRedirect,
  getAlreadyLoggedInRedirect,
  getSafeRedirectTarget,
} from "$lib/server/auth/redirect";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "$lib/server/auth/session";
import { db } from "$lib/server/db";
import { employee, user } from "$lib/server/db/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const load: PageServerLoad = ({ locals, url, request }) => {
  // A form sent without its JavaScript — while the server was down, say —
  // goes to the action's address, `/login?/login`, and the browser keeps it.
  // Opening that address again is a plain visit, so it is sent on to the same
  // page without the action part. A real form post is left alone: without
  // JavaScript the page is drawn from that post, and its error message would
  // be lost in a redirect.
  const actionKeys = [...url.searchParams.keys()].filter((key) =>
    key.startsWith("/"),
  );
  if (request.method === "GET" && actionKeys.length > 0) {
    const clean = new URL(url);
    for (const key of actionKeys) clean.searchParams.delete(key);
    throw redirect(303, clean.pathname + clean.search);
  }

  const requested = url.searchParams.get("redirectTo");

  if (locals.user) {
    const target = getAlreadyLoggedInRedirect(!!locals.user, requested);
    throw redirect(302, target || "/");
  }

  // The form posts to `?/login`, and that replaces the whole query string —
  // so the action cannot read redirectTo back off the URL. Hand it to the page
  // here instead and let the form carry it back as a hidden field. Validated
  // now so the field can never hold an off-site value, and validated again in
  // the action, since anything arriving from a form is client-controlled.
  return { redirectTo: getSafeRedirectTarget(requested, "") };
};

export const actions: Actions = {
  login: async (event) => {
    const form = await event.request.formData();
    const username = form.get("username");
    const password = form.get("password");
    const redirectTo = form.get("redirectTo");

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username ||
      !password
    ) {
      return fail(400, { error: "Username and password are required." });
    }

    // The join carries the employment status across: whether this person
    // still works here decides the sign-in before the account itself does.
    const [row] = await db
      .select({ account: user, employmentStatus: employee.employmentStatus })
      .from(user)
      .innerJoin(employee, eq(user.employeeFk, employee.employeePk))
      .where(eq(user.username, username))
      .limit(1);

    // Same generic error for "no such user" and "wrong password" — don't leak which one
    if (!row) {
      return fail(400, { error: "Invalid username or password." });
    }

    const found = row.account;

    // Checked ahead of the account status, and worded so it says nothing
    // about whether the password was right.
    if (row.employmentStatus !== "active") {
      return fail(403, {
        error:
          "This account belongs to somebody who no longer works here, so it can no longer be used. Contact your administrator.",
      });
    }

    if (found.accountStatus !== "active") {
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

      return fail(400, { error: "Invalid username or password." });
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

    // must-change-password takes priority over everything else below — that
    // screen has to come first. The target is not dropped though: it travels
    // on the query string so the change-password action can honour it once
    // the new password is set.
    if (found.mustChangePassword) {
      throw redirect(
        302,
        buildChangePasswordRedirect(
          typeof redirectTo === "string" ? redirectTo : null,
        ),
      );
    }

    // Everyone lands on the dashboard unless they were heading somewhere.
    const redirectTarget = getSafeRedirectTarget(
      typeof redirectTo === "string" ? redirectTo : null,
    );
    throw redirect(302, redirectTarget);
  },
};
