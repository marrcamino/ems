<script lang="ts">
  import { cn, dataAttr } from "$lib/utils/index.js";
  import type { Snippet } from "svelte";
  import { getStepperItem } from "./context.svelte.js";

  let { class: className, children }: { class?: string; children?: Snippet } =
    $props();

  const item = getStepperItem();
</script>

<span
  data-slot="stepper-title"
  data-upcoming={dataAttr(item.status === "upcoming" && !item.error)}
  class={cn(
    "block text-sm leading-5 text-foreground underline-offset-4 data-upcoming:text-muted-foreground group-hover/step-target:underline",
    className,
  )}
>
  {@render children?.()}
</span>
