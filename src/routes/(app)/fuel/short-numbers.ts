/**
 * Form numbers as a list shows them (decided by the owner, 27 October 2026):
 * without their year, `2026-10-118` as `10-118`, because the file date in the
 * same row tells the years apart. The running number shows 3 digits, and
 * every number in the list shows 4 once any of them has 4, so they stay
 * lined up. EMS still saves, prints, and searches the full number.
 */

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
