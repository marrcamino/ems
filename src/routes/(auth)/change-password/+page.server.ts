import { getPasswordStrengthError } from "$lib/validation/password";
import { hashPassword } from "$lib/server/auth/password"; // stays server-only, that one's fine
import {
  getDefaultLandingRoute,
  getSafeRedirectTarget,
} from "$lib/server/auth/redirect";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) redirect(302, "/login");

  // Where this person was headed when the forced password change interrupted
  // them, handed over by the login action. Validated here so the hidden field
  // can never hold an off-site value, and validated again in the action, since
  // anything arriving from a form is client-controlled.
  return {
    redirectTo: getSafeRedirectTarget(url.searchParams.get("redirectTo"), ""),
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "Session expired. Please log in again." });
    }

    const formData = await request.formData();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const redirectTo = formData.get("redirectTo");

    if (typeof password !== "string" || typeof confirmPassword !== "string") {
      return fail(400, { error: "Invalid form submission." });
    }

    const strengthError = getPasswordStrengthError(password);
    if (strengthError) {
      return fail(400, { error: strengthError });
    }
    if (password !== confirmPassword) {
      return fail(400, { error: "Passwords do not match." });
    }

    const passwordHash = await hashPassword(password);

    await db
      .update(user)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(user.userPk, locals.user.userPk));

    // Back to the page they were pulled off, or their own landing page when
    // they simply signed in for the first time and were headed nowhere.
    const fallback = getDefaultLandingRoute(locals.permissions);
    redirect(
      302,
      getSafeRedirectTarget(
        typeof redirectTo === "string" ? redirectTo : null,
        fallback,
      ),
    );
  },
};
