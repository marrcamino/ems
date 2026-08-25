// src/routes/admin/org-structure/[org_unit_pk]/employees/+server.ts
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { employee } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";

export const GET: RequestHandler = async ({ params }) => {
  const orgUnitPk = Number(params.org_unit_pk);

  if (!orgUnitPk || Number.isNaN(orgUnitPk)) {
    throw error(400, "Invalid org unit.");
  }

  // The division a person belongs to is recorded on `employee`, so this
  // lists people whether or not they have a login.
  const employees = await db
    .select({
      employeePk: employee.employeePk,
      firstName: employee.firstName,
      lastName: employee.lastName,
    })
    .from(employee)
    .where(
      and(
        eq(employee.orgUnitFk, orgUnitPk),
        eq(employee.employmentStatus, "active"),
      ),
    );

  return json({ employees });
};
