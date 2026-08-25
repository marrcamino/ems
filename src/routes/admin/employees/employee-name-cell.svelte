<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { initials } from "@/utils";
  import { fullName, type EmployeeRow } from "./context.svelte.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const separated = $derived(employee.employmentStatus === "separated");
</script>

<div class="flex items-center gap-3">
  <Avatar.Root class="size-8">
    <Avatar.Fallback class="text-xs" data-dimmed={separated ? "" : null}>
      {initials(employee)}
    </Avatar.Fallback>
  </Avatar.Root>

  <div class="grid min-w-0 gap-0.5">
    <span class="font-medium" class:text-muted-foreground={separated}>
      {fullName(employee)}
    </span>
    {#if employee.positionTitle}
      <span class="truncate text-xs text-muted-foreground">
        {employee.positionTitle}
      </span>
    {/if}
  </div>
</div>
