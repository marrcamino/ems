import { can } from "$lib/rbac/access";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error } from "@sveltejs/kit";
import { monthOf } from "../../paper/paper-month";
import { airTravelYear } from "../air-travel-year.server";
import type { PageServerLoad } from "./$types";

/** The year's flights, month by month, from what is already entered. */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "air_travel:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const currentMonth = monthOf(today(getLocalTimeZone()).toString());
  const lastYear = Number(currentMonth.slice(0, 4));
  const asked = Number(url.searchParams.get("year"));
  const year =
    Number.isInteger(asked) && asked >= 2000 && asked <= lastYear
      ? asked
      : lastYear;

  return {
    year,
    lastYear,
    months: await airTravelYear(
      String(year),
      year === lastYear ? currentMonth : `${year}-12`,
    ),
  };
};
