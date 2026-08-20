<script lang="ts">
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { SidebarTrigger } from "$lib/components/ui/sidebar/index.js";
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<header
  class="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background rounded-t-xl"
>
  <div class="flex items-center gap-2 px-4 w-full">
    <SidebarTrigger class="-ms-1" />
    <Separator
      orientation="vertical"
      class="me-2 data-[orientation=vertical]:h-4"
    />
    {@render children()}
  </div>
</header>
