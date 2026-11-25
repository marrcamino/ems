const dateFormat = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" });

/** "2026-03-22" → "Mar 22, 2026", read as a calendar date, not UTC. */
export function formatDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return dateFormat.format(new Date(y, m - 1, d));
}
