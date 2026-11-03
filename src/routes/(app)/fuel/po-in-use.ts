/**
 * Which open POs the newest withdrawals are charged to, and since when
 * (point 10.3 of "Recording a fuel issuance" in fuel-purchase-orders.md).
 *
 * Two POs mix when the newer one's first withdrawal comes before the older
 * one's last, in the list's own order: by date, then by order of entry.
 *
 * ```ts
 * poInUse(rows, ["PO-001", "PO-002"]);
 * // PO-001 runs Mar 2–Mar 11, PO-002 starts Mar 9:
 * // → { poNumbers: ["PO-001", "PO-002"], since: "2026-03-09" }
 * // PO-002 starts Mar 12 instead:
 * // → { poNumbers: ["PO-002"], since: "2026-03-12" }
 * ```
 */
export interface PoInUse {
  /** One PO, or several when their withdrawals mix, oldest first. */
  poNumbers: string[];
  /** The first withdrawal on the PO, or where the mixing starts. */
  since: string;
}

interface Row {
  id: number;
  fileDate: string;
  poNumber: string | null;
}

export function poInUse(
  rows: readonly Row[],
  openPoNumbers: readonly string[],
): PoInUse | null {
  const open = new Set(openPoNumbers);
  const ordered = [...rows].sort(
    (a, b) => a.fileDate.localeCompare(b.fileDate) || a.id - b.id,
  );

  // Each open PO's first and last withdrawal, by place in the list.
  const spans = new Map<string, { first: number; last: number }>();
  ordered.forEach((row, i) => {
    if (!row.poNumber || !open.has(row.poNumber)) return;
    const span = spans.get(row.poNumber);
    if (span) span.last = i;
    else spans.set(row.poNumber, { first: i, last: i });
  });
  if (spans.size === 0) return null;

  // Walk the POs from the oldest start; a PO that starts before the group
  // before it ends joins that group. The last group is the one in use now.
  const byStart = [...spans].sort(([, a], [, b]) => a.first - b.first);
  let group: string[] = [];
  let groupLast = -1;
  let since = -1;
  for (const [poNumber, span] of byStart) {
    if (span.first < groupLast) {
      if (group.length === 1) since = span.first;
      group.push(poNumber);
    } else {
      group = [poNumber];
      since = span.first;
    }
    groupLast = Math.max(groupLast, span.last);
  }
  return { poNumbers: group, since: ordered[since].fileDate };
}
