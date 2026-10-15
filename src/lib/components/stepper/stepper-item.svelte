<script lang="ts">
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { easeOut, prefersReducedMotion } from "$lib/utils/animation.js";
  import { cn, dataAttr } from "$lib/utils/index.js";
  import type { LucideIcon } from "@lucide/svelte";
  import Check from "@lucide/svelte/icons/check";
  import { onDestroy, type Snippet } from "svelte";
  import { cubicIn } from "svelte/easing";
  import type { TransitionConfig } from "svelte/transition";
  import {
    getStepper,
    setStepperItem,
    type StepStatus,
  } from "./context.svelte.js";

  /**
   * What the circle shows, first match wins: a spinner when `loading`, a "!"
   * when `error`, a check when done, the `icon` when given, otherwise the
   * step number.
   */
  let {
    done,
    loading = false,
    error = false,
    icon: Icon,
    disabled = false,
    class: className,
    children,
  }: {
    /** Left out, a step counts as done when it comes before `current`. */
    done?: boolean;
    /** Shows a spinner in the circle, over anything else. */
    loading?: boolean;
    /** Turns the circle and the description red. */
    error?: boolean;
    /** Shown in the circle in place of the step number. */
    icon?: LucideIcon;
    /**
     * Stops the step from being clicked, for example while the form is
     * saving. Even without it, only done steps can be clicked (and upcoming
     * ones when the root has `allowJumpAhead`): the current step is where the
     * user already is.
     */
    disabled?: boolean;
    class?: string;
    children?: Snippet;
  } = $props();

  const stepper = getStepper();

  const key = Symbol("step");
  stepper.register(key);
  onDestroy(() => stepper.unregister(key));

  const id = $props.id();

  const index = $derived(stepper.indexOf(key));
  const horizontal = $derived(stepper.orientation === "horizontal");

  const status = $derived.by((): StepStatus => {
    const isDone = done ?? index < stepper.current;
    if (isDone) return "done";
    if (index === stepper.current) return "current";
    return "upcoming";
  });

  const clickable = $derived.by(() => {
    if (disabled) return false;
    if (status === "done") return true;
    if (status === "upcoming") return stepper.allowJumpAhead;
    return false; // the current step: the user is already there
  });

  // Read out by screen readers before the title, e.g. "Step 2, done:".
  const STATUS_LABELS: Record<StepStatus, string> = {
    done: "done",
    current: "current step",
    upcoming: "not started",
  };

  const statusLabel = $derived.by(() => {
    if (loading) return "loading";
    if (error) return "needs fixing";
    return STATUS_LABELS[status];
  });

  type Shown = "loading" | "error" | "done" | "icon" | "number";

  // What the circle shows, first match wins. Current and upcoming both show
  // the number, so moving between them swaps no content.
  const shown = $derived.by((): Shown => {
    if (loading) return "loading";
    if (error) return "error";
    if (status === "done") return "done";
    if (Icon) return "icon";
    return "number";
  });

  // The circle's look. An error overrides the step's status.
  type Look = StepStatus | "error";

  const CIRCLE_LOOKS: Record<Look, string> = {
    done: "border-primary bg-primary text-white",
    // The number or icon takes the text color, so both turn primary.
    current:
      "border-primary bg-background font-medium text-primary ring-5 ring-primary/15",
    upcoming: "border-border bg-background text-muted-foreground",
    error:
      "border-destructive bg-background font-medium text-destructive ring-5 ring-destructive/15",
  };

  const look = $derived<Look>(error ? "error" : status);

  const lineFill = $derived.by(() => {
    const filled = status === "done";
    if (horizontal) {
      return filled ? "origin-left scale-x-100" : "origin-left scale-x-0";
    }
    return filled ? "origin-top scale-y-100" : "origin-top scale-y-0";
  });

  // For the number and the "!". A line of text is taller than its digits and
  // each font places them differently inside it, so centering the line left
  // the digit a little high or low depending on the font. Trimming the line
  // to the top of the digits and the baseline centers the digit itself.
  const glyph = "block leading-none [text-box:trim-both_cap_alphabetic]";

  // Swapping the circle's content: the old one blurs, shrinks to 80% and is
  // gone in 80ms, while the new one grows from 50% out of a blur over 150ms.
  // Both start together and overlap. With reduced motion they only fade.
  function swapIn(_node: Element): TransitionConfig {
    const still = prefersReducedMotion();
    return {
      duration: 150,
      easing: easeOut,
      css: (t, u) =>
        still
          ? `opacity: ${t}`
          : `opacity: ${t}; filter: blur(${u * 4}px); scale: ${0.5 + t * 0.5}`,
    };
  }

  function swapOut(_node: Element): TransitionConfig {
    const still = prefersReducedMotion();
    return {
      duration: 80,
      easing: cubicIn,
      css: (t, u) =>
        still
          ? `opacity: ${t}`
          : `opacity: ${t}; filter: blur(${u * 4}px); scale: ${0.8 + t * 0.2}`,
    };
  }

  // Colors change over 180ms. The halo (green on the current step, red on a
  // step with an error) is the exception: it fades in only after the content
  // swap (200ms delay), and disappears at once when the step loses it,
  // because the transition used is always the one of the state being entered.
  const colors =
    "color 180ms ease, background-color 180ms ease, border-color 180ms ease";
  const halo = "box-shadow 150ms ease-out 200ms";

  const circleTransition = $derived.by(() => {
    const hasHalo = look === "current" || look === "error";
    if (hasHalo) return `${colors}, ${halo}`;
    return colors;
  });

  setStepperItem({
    get status() {
      return status;
    },
    get error() {
      return error;
    },
  });
</script>

<li
  data-slot="stepper-item"
  data-horizontal={horizontal}
  class={cn(
    "group/step relative",
    "data-[horizontal=false]:not-last:pb-6",
    "data-[horizontal=true]:min-w-0 data-[horizontal=true]:flex-1 data-[horizontal=true]:last:flex-none",
    className,
  )}
  aria-current={status === "current" ? "step" : undefined}
>
  <!--
    The line to the next step. It runs from the edge of this circle to just
    before the next one, and the last step has none.
  -->
  <span
    data-orientation={stepper.orientation}
    class={cn(
      "absolute overflow-hidden rounded-full bg-border group-last/step:hidden",
      // The line to the next step: where it sits, and how it fills. The fill is
      // scaled from 0 to full along the line once this step is done.
      "data-[orientation=horizontal]:inset-s-10 data-[orientation=horizontal]:top-3.75 data-[orientation=horizontal]:inset-e-2 data-[orientation=horizontal]:h-0.5",
      "data-[orientation=vertical]:inset-s-3.75 data-[orientation=vertical]:top-9.5 data-[orientation=vertical]:bottom-1.5 data-[orientation=vertical]:w-0.5",
    )}
    aria-hidden="true"
  >
    <!-- Fills toward the next step once this one is done. -->
    <span
      class={cn(
        "absolute inset-0 bg-primary transition-[scale] duration-300 ease-in-out-strong motion-reduce:transition-none",
        lineFill,
      )}
    ></span>
  </span>

  <!--
    The circle and text never move into or out of the button. When a step
    becomes done it also becomes clickable, and re-creating the circle at
    that moment would skip the number-to-check animation. So the button is
    an empty layer laid over them, added when the step can be clicked.
  -->
  <div
    class={cn(
      "relative flex max-w-full gap-3 text-start",
      horizontal && "flex-col items-start",
      clickable && "group/step-target",
    )}
  >
    <span
      class={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm",
        CIRCLE_LOOKS[look],
      )}
      style:transition={circleTransition}
      aria-hidden="true"
    >
      <!--
        Keyed on what is shown, so a change keeps the old content while the
        new one comes in, both in the same grid cell. Nothing animates on the
        first render: Svelte only plays these when the key changes.
      -->
      {#key shown}
        <span
          class="col-start-1 row-start-1 flex items-center justify-center"
          in:swapIn
          out:swapOut
        >
          {#if shown === "loading"}
            <Spinner class="size-4" />
          {:else if shown === "error"}
            <span class={cn(glyph, "font-semibold")}>!</span>
          {:else if shown === "done"}
            <Check class="size-4" strokeWidth={2.5} />
          {:else if shown === "icon" && Icon}
            <Icon class="size-4" />
          {:else}
            <span class={glyph}>{index + 1}</span>
          {/if}
        </span>
      {/key}
    </span>
    <span id="{id}-status" class="sr-only">
      Step {index + 1}, {statusLabel}:
    </span>
    <span id="{id}-label" class="contents">
      {@render children?.()}
    </span>

    {#if clickable}
      <button
        type="button"
        class="absolute inset-0 cursor-pointer rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-labelledby="{id}-status {id}-label"
        onclick={() => (stepper.current = index)}
      ></button>
    {/if}
  </div>
</li>
