import { getPasswordStrengthError } from "$lib/validation/password";
import { hashPassword } from "$lib/server/auth/password"; // stays server-only, that one's fine
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/login");
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "Session expired. Please log in again." });
    }

    const formData = await request.formData();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

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

    redirect(302, "/");
  },
};
