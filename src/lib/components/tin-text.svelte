<script lang="ts">
  import { cn } from "$lib/utils/index.js";

  /**
   * Shows a TIN in groups of 3 digits (123 456 789 000) without putting any
   * space characters in the text. Each group is its own span, and the gap
   * between them is a margin, so selecting and copying the number gives the
   * bare digits (123456789000), ready to paste into another system.
   *
   * Takes the TIN in any shape: whatever is not a digit is dropped first.
   */
  let { tin, class: className }: { tin: string; class?: string } = $props();

  const groups = $derived(tin.replace(/\D/g, "").match(/\d{1,3}/g) ?? []);
</script>

<!--
  The spans are written on one line, with nothing between them. A line break
  between them would become a space in the copied text.
-->
<span class={cn("tabular-nums", className)}
  >{#each groups as group, i (i)}<span class="not-first:ms-[0.5ch]"
      >{group}</span
    >{/each}</span
>
