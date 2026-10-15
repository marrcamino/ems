<script lang="ts">
  import { cn, dataAttr } from "$lib/utils/index.js";
  import type { Snippet } from "svelte";
  import { getStepperItem } from "./context.svelte.js";

  let { class: className, children }: { class?: string; children?: Snippet } =
    $props();

  const item = getStepperItem();
</script>

<span
  data-slot="stepper-description"
  data-error={dataAttr(item.error)}
  class={cn(
    "mt-0.5 block text-xs leading-4 transition-colors duration-200",
    "data-error:text-destructive text-muted-foreground",
    className,
  )}
>
  {@render children?.()}
</span>
