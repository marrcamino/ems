<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { roleKindOf } from "$lib/rbac/permission-tree";
  import { ShieldCheck, SquarePen } from "@lucide/svelte/icons";
  import type { RoleRow } from "./context.svelte.js";

  let { role }: { role: RoleRow } = $props();

  // Derived from what the role holds rather than stored in a column: an
  // admin role is one holding any admin key, and the two are never mixed.
  const kind = $derived(roleKindOf(role.permissions));
</script>

{#if kind === "admin"}
  <Badge variant="outline"><ShieldCheck /> Admin</Badge>
{:else if kind === "staff"}
  <Badge variant="outline"><SquarePen /> Staff</Badge>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
