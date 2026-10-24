<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import type { RoleRow } from "./context.svelte.js";

  let { status }: { status: RoleRow["status"] } = $props();
</script>

<Badge variant={status === "active" ? "secondary" : "outline"}>
  <span
    class="size-1.5 rounded-full"
    class:bg-emerald-500={status === "active"}
    class:bg-muted-foreground={status !== "active"}
  ></span>
  {status === "active" ? "Active" : "Inactive"}
</Badge>
