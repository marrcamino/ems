/**
 * Months on the Paper page are written `2026-11`, in the address and in the
 * data the page gets. A report stores the first day, `2026-11-01`.
 */

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/** `2026-11-23` → `2026-11`. */
export function monthOf(isoDate: string) {
  return isoDate.slice(0, 7);
}

/** `2026-11` → `2026-11-01`, as `paper_monthly_report.report_month`. */
export function firstDay(month: string) {
  return `${month}-01`;
}

/** `2026-11` → `2026-11-30`. */
export function lastDay(month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return `${month}-${String(days).padStart(2, "0")}`;
}

/** `2026-11` and 1 → `2026-12`. */
export function addMonths(month: string, count: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + count, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const monthFormat = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
});
const monthOnlyFormat = new Intl.DateTimeFormat("en-PH", { month: "long" });

/** `2026-11` → `November 2026`. */
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return monthFormat.format(new Date(y, m - 1, 1));
}

/** `2026-11` → `November`. */
export function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return monthOnlyFormat.format(new Date(y, m - 1, 1));
}

export function reamCount(reams: number) {
  return `${reams.toLocaleString("en-PH")} ${reams === 1 ? "ream" : "reams"}`;
}

/**
 * Why a month cannot be submitted yet, or undefined when it can: only once
 * it is over, so that no paper taken late in the month is left out of a
 * submitted, locked month. The page shows it under the Submit button; the
 * server refuses with the same words.
 */
export function submitTooEarly(month: string, currentMonth: string) {
  if (month < currentMonth) return undefined;
  // The owner's wording: any day after the month, not only its first.
  return "You can only submit after this month.";
}
