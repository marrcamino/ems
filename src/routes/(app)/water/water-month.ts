import { addMonths } from "../paper/paper-month";

/**
 * The newest month that the Water page shows: the one before the current
 * month. A month's water is known only once the meter is read, early in the
 * next month, so the current month is never entered or submitted.
 */
export function lastMonthOver(currentMonth: string) {
  return addMonths(currentMonth, -1);
}

/** The server refuses a month that is not over with these words. */
export const MONTH_NOT_OVER =
  "You can only record water use for a month that is over.";
