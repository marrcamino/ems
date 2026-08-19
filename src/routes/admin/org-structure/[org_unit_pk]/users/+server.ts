// src/routes/admin/org-units/[orgUnitPk]/users/+server.ts
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";

export const GET: RequestHandler = async ({ params }) => {
  const orgUnitPk = Number(params.org_unit_pk);

  if (!orgUnitPk || Number.isNaN(orgUnitPk)) {
    throw error(400, "Invalid org unit.");
  }

  const users = await db
    .select({
      userPk: user.userPk,
      firstName: user.firstName,
      lastName: user.lastName,
    })
    .from(user)
    .where(and(eq(user.orgUnitFk, orgUnitPk), eq(user.status, "active")));

  return json({ users });
};
