import { can } from "$lib/rbac/access";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error } from "@sveltejs/kit";
import { monthOf } from "../../paper/paper-month";
import { yearWaste } from "../eswm-year.server";
import type { PageServerLoad } from "./$types";

/** The year's figures, month by month, from what is already entered. */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "eswm:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const currentMonth = monthOf(today(getLocalTimeZone()).toString());
  const currentYear = Number(currentMonth.slice(0, 4));
  const asked = Number(url.searchParams.get("year"));
  const year =
    Number.isInteger(asked) && asked >= 2000 && asked <= currentYear
      ? asked
      : currentYear;

  const lastMonth = year === currentYear ? currentMonth : `${year}-12`;
  const months = await yearWaste(String(year), lastMonth);

  return { year, currentYear, months };
};
