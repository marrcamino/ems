import { can } from "$lib/rbac/access";
import { getLocalTimeZone, today } from "@internationalized/date";
import { error } from "@sveltejs/kit";
import { monthOf } from "../../paper/paper-month";
import { lastMonthOver } from "../electricity-month";
import {
  electricityYear,
  electricityYearByBuilding,
} from "../electricity-year.server";
import type { PageServerLoad } from "./$types";

/**
 * The year's electricity, month by month and building by building, from what
 * is already entered.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!can(locals.permissions, "electricity:view")) {
    throw error(403, "You do not have permission to view this page.");
  }

  const lastMonth = lastMonthOver(
    monthOf(today(getLocalTimeZone()).toString()),
  );
  const lastYear = Number(lastMonth.slice(0, 4));
  const asked = Number(url.searchParams.get("year"));
  const year =
    Number.isInteger(asked) && asked >= 2000 && asked <= lastYear
      ? asked
      : lastYear;

  return {
    year,
    lastYear,
    months: await electricityYear(String(year), lastMonth),
    buildings: await electricityYearByBuilding(String(year), lastMonth),
  };
};
