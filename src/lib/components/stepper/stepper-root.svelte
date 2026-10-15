<script lang="ts">
  import { cn } from "$lib/utils/index.js";
  import type { Snippet } from "svelte";
  import {
    setStepper,
    StepperState,
    type StepperOrientation,
  } from "./context.svelte.js";

  let {
    current = $bindable(0),
    orientation = "horizontal",
    allowJumpAhead = false,
    class: className,
    children,
  }: {
    /** Index of the step the user is on, starting at 0. */
    current?: number;
    orientation?: StepperOrientation;
    /**
     * Lets the user click a step they have not reached yet. Left off, only
     * done steps can be clicked, so no step is skipped.
     */
    allowJumpAhead?: boolean;
    class?: string;
    children?: Snippet;
  } = $props();

  setStepper(
    new StepperState({
      getCurrent: () => current,
      setCurrent: (index) => (current = index),
      getOrientation: () => orientation,
      getAllowJumpAhead: () => allowJumpAhead,
    }),
  );
</script>

<ol
  data-slot="stepper"
  data-orientation={orientation}
  class={cn(
    "flex",
    "data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row",
    "data-[orientation=vertical]:flex-col",
    className,
  )}
>
  {@render children?.()}
</ol>
