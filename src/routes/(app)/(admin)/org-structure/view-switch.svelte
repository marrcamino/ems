<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Network, Table2 } from "@lucide/svelte/icons";
  import { getOrgUnitContext } from "./context.svelte.js";

  const ctx = getOrgUnitContext();
</script>

<div class="inline-flex items-center gap-0.5 rounded-lg border p-0.5">
  <Button
    variant={ctx.view === "canvas" ? "secondary" : "ghost"}
    size="sm"
    aria-pressed={ctx.view === "canvas"}
    onclick={() => (ctx.view = "canvas")}
  >
    <Network /> Chart
  </Button>
  <Button
    variant={ctx.view === "table" ? "secondary" : "ghost"}
    size="sm"
    aria-pressed={ctx.view === "table"}
    onclick={() => (ctx.view = "table")}
  >
    <Table2 /> Table
  </Button>
</div>
