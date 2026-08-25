/**
 * The pieces every faceted table filter needs: an option, an option with a
 * count beside it, and the two ways of building a list of them.
 *
 * Shared rather than written per page so a count can never disagree with the
 * filter it sits next to.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface CountedOption extends FilterOption {
  count: number;
}

function tally(values: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * Counts for a fixed list of options — a status or a yes/no split, where the
 * options are known in advance and an option matching nobody still belongs on
 * screen, greyed out, so the reader can see it exists.
 */
export function withCounts(
  options: FilterOption[],
  values: Iterable<string>,
): CountedOption[] {
  const counts = tally(values);

  return options.map((option) => ({
    ...option,
    count: counts.get(option.value) ?? 0,
  }));
}

/**
 * Options taken from the data itself — role and section names, which are rows
 * in a table rather than a list written in code.
 */
export function optionsFromValues(values: Iterable<string>): CountedOption[] {
  return [...tally(values).entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** How many options are ticked across every dropdown on a page. */
export function countActiveFilters(
  filters: Record<string, string[]>,
): number {
  return Object.values(filters).reduce(
    (total, values) => total + values.length,
    0,
  );
}

/**
 * Keeps a row that matches any ticked option. An empty list means the dropdown
 * was never touched, which means "no filter" rather than "match nothing".
 */
export function filterFn_isOneOf(
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown,
) {
  const chosen = filterValue as string[];
  if (!chosen?.length) return true;

  return chosen.includes(String(row.getValue(columnId)));
}
