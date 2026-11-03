<script lang="ts" module>
  import {
    ArrowDown,
    ArrowDown01,
    ArrowDown10,
    ArrowDownAZ,
    ArrowDownWideNarrow,
    ArrowDownZA,
    ArrowUp,
    ArrowUp01,
    ArrowUp10,
    ArrowUpAZ,
    ArrowUpDown,
    ArrowUpNarrowWide,
    ArrowUpZA,
    CalendarArrowDown,
    CalendarArrowUp,
    ClockArrowDown,
    ClockArrowUp,
  } from "@lucide/svelte/icons";

  /**
   * The down icon is the up icon turned upside down, so the bars, letters, or
   * digits always show the order the rows are in. Lucide pairs its own
   * `sort-asc` and `sort-desc` icons the same way. Every type shares one icon
   * for a column that isn't sorted.
   */
  const ICONS = {
    arrow: { asc: ArrowUp, desc: ArrowDown },
    "narrow-wide":{ asc: ArrowUpNarrowWide, desc: ArrowDownWideNarrow },
    clock: { asc: ClockArrowUp, desc: ClockArrowDown },
    calendar: { asc: CalendarArrowUp, desc: CalendarArrowDown },
    "a-z": { asc: ArrowUpAZ, desc: ArrowDownZA },
    "z-a": { asc: ArrowUpZA, desc: ArrowDownAZ },
    "0-1": { asc: ArrowUp01, desc: ArrowDown10 },
    "1-0": { asc: ArrowUp10, desc: ArrowDown01 },
  };

  export type SortIconType = keyof typeof ICONS;
  export const SORT_ICON_TYPES = Object.keys(ICONS) as SortIconType[];
</script>

<script lang="ts">
  import { cn } from "$lib/utils/index.js";
  import type { LucideProps } from "@lucide/svelte";

  /**
   * The icon beside a sortable column's name, showing whether the column is
   * sorted and which way.
   *
   * ```svelte
   * <SortIcon type="a-z" sorted={header.column.getIsSorted()} />
   * ```
   *
   * `sorted` takes what TanStack's `getIsSorted()` returns: `"asc"`, `"desc"`,
   * or `false` for a column that isn't sorted. The unsorted icon is faded, as
   * in the existing tables. `type` picks the family of icons.
   */
  let {
    type = "arrow",
    sorted,
    class: className,
    ...restProps
  }: LucideProps & {
    type?: SortIconType;
    sorted: "asc" | "desc" | false;
  } = $props();

  const Icon = $derived(sorted ? ICONS[type][sorted] : ArrowUpDown);
</script>

<Icon
  class={cn("size-3.5", !sorted && "opacity-40", className)}
  {...restProps}
/>
