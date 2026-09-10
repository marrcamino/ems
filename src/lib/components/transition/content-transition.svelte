<script lang="ts">
  import { cn } from "$lib/utils/index.js";
  import {
    autoHeight,
    contentIn,
    contentOut,
    DURATION,
  } from "$lib/utils/animation.js";
  import type { Snippet } from "svelte";

  interface Props {
    /**
     * True while the data is still on its way. Keep this separate from the data
     * itself, so an empty array never has to stand in for "not loaded yet".
     */
    loading?: boolean;
    /** True when the data arrived but there is nothing to show. */
    isEmpty?: boolean;
    /** Shown while `loading`. */
    skeleton?: Snippet;
    /** Shown when `isEmpty`. */
    empty?: Snippet;
    /** Shown once there is something to show. */
    children: Snippet;
    /**
     * Animate the wrapper's height when one state gives way to another.
     * Turn off inside anything that already scrolls or clips.
     */
    animateHeight?: boolean;
    /**
     * Keep the skeleton on screen for at least this many milliseconds, even if
     * the data is already there. `0` hands over the moment it arrives.
     *
     * This makes the screen slower on purpose, so it is a development aid
     * rather than something to ship. It is useful when the data comes back in
     * a few milliseconds — a local database, say — and the swap is over before
     * you can see whether it looks right.
     */
    minSkeletonDuration?: number;
    /** Pixels the arriving content settles down through. `0` fades in place. */
    distance?: number;
    /**
     * Set to false while the content is changing because the *view* changed
     * rather than the data — a search box being typed into, for instance. The
     * states still swap, they just swap instantly.
     */
    animated?: boolean;
    class?: string;
  }

  let {
    loading = false,
    isEmpty = false,
    skeleton,
    empty,
    children,
    animateHeight = true,
    minSkeletonDuration = 0,
    distance = 8,
    animated = true,
    class: className,
  }: Props = $props();

  /**
   * The hold starts the moment the skeleton appears, not when the data lands,
   * so a slow request is never made slower — by the time it answers, some or
   * all of the hold has already been served.
   */
  let holdingSkeleton = $state(false);
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    if (!loading) return;
    const hold = minSkeletonDuration;
    clearTimeout(releaseTimer);
    holdingSkeleton = hold > 0;
    if (hold > 0) {
      releaseTimer = setTimeout(() => (holdingSkeleton = false), hold);
    }
  });

  $effect(() => () => clearTimeout(releaseTimer));

  let showingSkeleton = $derived(loading || holdingSkeleton);

  /**
   * The arriving block waits for the leaving one to be gone rather than
   * crossfading with it. Two states at partial opacity on top of each other
   * never resolve into one picture — you read it as a smear, not as a swap.
   */
  let inParams = $derived({
    distance: animated ? distance : 0,
    duration: animated ? DURATION.phase : 0,
    delay: animated ? DURATION.exit : 0,
  });
  let outParams = $derived({ duration: animated ? DURATION.exit : 0 });
</script>

<div use:autoHeight={{ enabled: animateHeight && animated }} class={cn(className)}>
  <div class="relative grid">
    {#if showingSkeleton}
      <div
        class="col-start-1 row-start-1"
        in:contentIn={inParams}
        out:contentOut={outParams}
      >
        {@render skeleton?.()}
      </div>
    {:else if isEmpty}
      <div
        class="col-start-1 row-start-1"
        in:contentIn={inParams}
        out:contentOut={outParams}
      >
        {@render empty?.()}
      </div>
    {:else}
      <div
        class="col-start-1 row-start-1"
        in:contentIn={inParams}
        out:contentOut={outParams}
      >
        {@render children()}
      </div>
    {/if}
  </div>
</div>
