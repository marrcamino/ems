/**
 * The numbers EMS gives out, `2026-10-118`: the year and month, then the
 * form's running number for the year. A list shows them without the year, as
 * `10-118` (decided by the owner, 27 October 2026), because the file date in
 * the same row tells the years apart. The running number shows 3 digits, and
 * every number in the list shows 4 once any of them has 4, so they stay
 * lined up. EMS still saves, prints, and searches the full number.
 */

/** `2026-11-005`: the day's year and month, then the running number. */
export function formNumber(day: string, running: number) {
  return `${day.slice(0, 7)}-${String(running).padStart(3, "0")}`;
}

/** The running number, the last part of `2026-10-118` or `10-118`. */
function running(full: string) {
  return Number(full.split("-").at(-1));
}

/** How many digits every number in the list shows: 3, or more if needed. */
export function runningWidth(numbers: (string | null)[]) {
  let width = 3;
  for (const full of numbers) {
    if (full) width = Math.max(width, String(running(full)).length);
  }
  return width;
}

/** `2026-10-118` → `10-118`, padded to `width` digits. */
export function shortNumber(full: string, width: number) {
  const parts = full.split("-");
  const month = parts.at(-2);
  return `${month}-${String(running(full)).padStart(width, "0")}`;
}

/** The forms EMS numbers, in the order the forms are shown. Keep in step with `form_counter.form`. */
export const FORMS = ["control", "ws", "ris", "dtt"] as const;
export type Form = (typeof FORMS)[number];

export const FORM_LABELS: Record<Form, string> = {
  control: "Control number",
  ws: "Withdrawal slip (WS)",
  ris: "RIS",
  dtt: "Trip ticket (DTT)",
};
