<script lang="ts">
  import type { OrgUnit } from "$lib/types";

  let { unit }: { unit: OrgUnit } = $props();
</script>

<span class="text-sm capitalize text-muted-foreground">{unit.level}</span>
