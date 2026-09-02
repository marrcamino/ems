// src/routes/admin/employees/[employee_pk]/history/+server.ts
import { can } from "$lib/rbac/access";
import { db } from "$lib/server/db";
import { employeeHistory, user } from "$lib/server/db/schema";
import { countDocumentsUsingVersions } from "$lib/server/employee-history";
import { error, json } from "@sveltejs/kit";
import { desc, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/**
 * Every version of one person's name and position, newest first.
 *
 * Fetched when the history panel opens rather than loaded with the page.
 * Almost nobody opens it, and loading every person's whole history to show a
 * table of names would read far more than the page needs.
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!can(locals.permissions, "admin:view_employees")) {
    throw error(403, "You do not have permission to view this.");
  }

  const employeePk = Number(params.employee_pk);
  if (!employeePk || Number.isNaN(employeePk)) {
    throw error(400, "Invalid employee.");
  }

  // Ordered by the date the version started, newest first, so the current one
  // is at the top. The primary key breaks a tie between two versions that
  // start on the same day, which only happens when somebody is separated and
  // brought back within one day.
  const entries = await db
    .select({
      employeeHistoryPk: employeeHistory.employeeHistoryPk,
      firstName: employeeHistory.firstName,
      middleName: employeeHistory.middleName,
      lastName: employeeHistory.lastName,
      suffix: employeeHistory.suffix,
      positionTitle: employeeHistory.positionTitle,
      positionShortForm: employeeHistory.positionShortForm,
      validFrom: employeeHistory.validFrom,
      validUntil: employeeHistory.validUntil,
      createdByUsername: user.username,
    })
    .from(employeeHistory)
    .leftJoin(user, eq(user.userPk, employeeHistory.createdByFk))
    .where(eq(employeeHistory.employeeFk, employeePk))
    .orderBy(
      desc(employeeHistory.validFrom),
      desc(employeeHistory.employeeHistoryPk),
    );

  // How many filed documents print each entry, so the panel can warn with a
  // real number before one is written over. Zero for everything today.
  const counts = await countDocumentsUsingVersions(
    entries.map((entry) => entry.employeeHistoryPk),
  );

  return json({
    entries: entries.map((entry) => ({
      ...entry,
      documentCount: counts[entry.employeeHistoryPk] ?? 0,
    })),
  });
};
