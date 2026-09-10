<script lang="ts" generics="T">
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { cn } from "$lib/utils/index.js";
  import {
    DURATION,
    easeOut,
    itemIn,
    itemOut,
    prefersReducedMotion,
  } from "$lib/utils/animation.js";
  import type { Snippet } from "svelte";
  import { flip } from "svelte/animate";
  import ContentTransition from "./content-transition.svelte";

  interface Props {
    items: T[];
    /** Must be stable per row. An array index will break add and remove. */
    key: (item: T, index: number) => string | number;
    /** True while the rows are still on their way. Never encode this in `items`. */
    loading?: boolean;
    item: Snippet<[T, number]>;
    /** Replaces the plain bars shown while loading. */
    skeleton?: Snippet;
    /** Shown when `items` is empty, including after the last row is removed. */
    empty?: Snippet;
    /** How many bars the default skeleton draws. Match the usual row count. */
    skeletonRows?: number;
    /**
     * Keep the skeleton on screen for at least this many milliseconds, even if
     * the rows are already there. A development aid — see the same prop on
     * `content-transition.svelte`. Setting it also means a first appearance
     * cannot be staggered, because by the time the skeleton lets go the rows
     * are no longer new.
     */
    minSkeletonDuration?: number;
    /**
     * Milliseconds between rows on the list's first appearance. Off by default;
     * a handful of dashboard cards is what this is for, not a long table.
     */
    stagger?: number;
    animateHeight?: boolean;
    /**
     * Set to false while the list is changing because the *view* changed rather
     * than the data — a search box being typed into is the usual reason. Rows
     * still appear and disappear, they just do it instantly. Adding, removing
     * and re-sorting are data changes and should leave this alone.
     */
    animated?: boolean;
    /** Outer wrapper. */
    class?: string;
    /** The element holding the rows, so you can make it a grid or change the gap. */
    listClass?: string;
    /** Each row's wrapper. */
    itemClass?: string;
  }

  let {
    items,
    key,
    loading = false,
    item,
    skeleton,
    empty,
    skeletonRows = 3,
    minSkeletonDuration = 200,
    stagger = 0,
    animateHeight = true,
    animated = true,
    class: className,
    listClass,
    itemClass,
  }: Props = $props();

  /** Never stagger a long list: ten rows at 40ms is already 400ms of waiting. */
  const MAX_STAGGERED = 10;

  /**
   * A row animates in only when it is new to a list that is already on screen.
   * On the list's first appearance the whole block is already settling into
   * place, and a second animation on every row on top of that reads as
   * sluggish.
   *
   * `wasAnimated` covers the moment a search box is cleared: `animated` turns
   * back on in the same update that brings the filtered-out rows back, and
   * those rows returning is still a view change, so they must not animate.
   *
   * None of these are `$state`, deliberately. They are updated in an effect,
   * which runs after the transitions for this render have already read them.
   */
  let seen = new Set<string | number>();
  let listWasVisible = false;
  let wasAnimated = true;

  $effect(() => {
    const showingRows = !loading && items.length > 0;
    if (showingRows) {
      seen = new Set(items.map((entry, index) => key(entry, index)));
    } else {
      seen.clear();
    }
    listWasVisible = showingRows;
    wasAnimated = animated;
  });

  function introFor(rowKey: string | number, index: number) {
    if (!animated || !wasAnimated) return { duration: 0 };
    if (!listWasVisible) {
      return stagger > 0
        ? {
            duration: DURATION.item,
            delay: Math.min(index, MAX_STAGGERED) * stagger,
          }
        : { duration: 0 };
    }
    return seen.has(rowKey) ? { duration: 0 } : { duration: DURATION.item };
  }

  function flipParams() {
    const still = !animated || !wasAnimated || prefersReducedMotion();
    return { duration: still ? 0 : DURATION.item, easing: easeOut };
  }
</script>

<ContentTransition
  {loading}
  {empty}
  {animateHeight}
  {animated}
  {minSkeletonDuration}
  isEmpty={items.length === 0}
  skeleton={skeleton ?? defaultSkeleton}
  distance={stagger > 0 ? 0 : 8}
  class={className}
>
  <div class={cn("relative flex flex-col gap-2", listClass)}>
    {#each items as entry, index (key(entry, index))}
      <div animate:flip={flipParams()}>
        <div
          class={itemClass}
          in:itemIn={introFor(key(entry, index), index)}
          out:itemOut={{ duration: animated ? DURATION.exit : 0 }}
        >
          {@render item(entry, index)}
        </div>
      </div>
    {/each}
  </div>
</ContentTransition>

{#snippet defaultSkeleton()}
  <div class={cn("flex flex-col gap-2", listClass)}>
    {#each Array.from({ length: skeletonRows }) as _, index (index)}
      <Skeleton class="h-12 w-full" />
    {/each}
  </div>
{/snippet}
