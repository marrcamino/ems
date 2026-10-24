<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import type { OrgUnit } from "$lib/types";

  let { unit }: { unit: OrgUnit } = $props();
</script>

{#if unit.status === "inactive"}
  <Badge variant="destructive" class="capitalize">Inactive</Badge>
{:else}
  <Badge variant="secondary" class="capitalize">Active</Badge>
{/if}
