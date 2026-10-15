<script lang="ts">
  import { cn } from "$lib/utils/index.js";
  import type { Snippet } from "svelte";
  import { getStepper, getStepperItem } from "./context.svelte.js";

  let { class: className, children }: { class?: string; children?: Snippet } =
    $props();

  const stepper = getStepper();
  getStepperItem();
</script>

<span
  data-slot="stepper-header"
  data-orientation={stepper.orientation}
  class={cn(
    "block min-w-0",
    "data-[orientation=vertical]:pt-1.5",
    "data-[orientation=horizontal]:pe-4 data-[orientation=horizontal]:group-last/step:pe-0",
    className,
  )}
>
  {@render children?.()}
</span>
