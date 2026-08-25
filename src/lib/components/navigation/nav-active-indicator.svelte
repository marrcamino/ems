<script lang="ts">
  import { cn } from "$lib/utils/index.js";

  interface Props {
    /** Whether the link this belongs to is the current page. */
    active: boolean;
    /** Position and size overrides, for menus whose rows sit differently. */
    class?: string;
  }

  let { active, class: className }: Props = $props();
</script>

<!--
  The bar that marks the current page. It is positioned against the menu row
  around it, so whatever wraps it has to be positioned too - both
  Sidebar.MenuItem and Sidebar.MenuSubItem already are.
-->
<span
  aria-hidden="true"
  class={cn(
    "bg-primary absolute -left-0.5 h-4.5 w-1 rounded-lg opacity-0 transition-opacity",
    active && "opacity-100",
    className,
  )}
></span>
