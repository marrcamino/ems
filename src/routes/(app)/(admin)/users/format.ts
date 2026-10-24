/**
 * Date formatting for this page. The server runs offline on the office LAN,
 * so these are formatted in the browser against whatever locale the machine
 * is set to, with an explicit fallback rather than a bare ISO string.
 */

const DATE_TIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const DATE_ONLY: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleString(undefined, DATE_TIME);
}

export function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString(undefined, DATE_ONLY);
}

/**
 * "Today", "Yesterday", or a date. Anything older than a week is given as a
 * plain date — "23 days ago" is harder to act on than the date itself.
 */
export function formatWhen(value: Date | null): string {
  if (!value) return "Never";

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(value)) / 86_400_000,
  );

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return formatDate(value);
}
