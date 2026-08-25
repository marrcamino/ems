<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import type { EmployeeRow } from "./context.svelte.js";
  import { EMPLOYMENT_STATUS_LABELS } from "./labels.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const employed = $derived(employee.employmentStatus === "active");
</script>

<Badge variant={employed ? "secondary" : "outline"}>
  <span
    class="size-1.5 rounded-full"
    class:bg-emerald-500={employed}
    class:bg-muted-foreground={!employed}
  ></span>
  {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
</Badge>
