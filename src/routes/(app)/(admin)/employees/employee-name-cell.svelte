<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { nameInitials } from "@/utils";
  import { fullName, type EmployeeRow } from "./context.svelte.js";
  import Badge from "@/components/ui/badge/badge.svelte";
  import { getGlobalContext } from "$routes/global-context.svelte.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const separated = $derived(employee.employmentStatus === "separated");
  const globalCtx = getGlobalContext();
</script>

<div class="flex items-center gap-3">
  <Avatar.Root class="size-8">
    <Avatar.Fallback class="text-xs" data-dimmed={separated ? "" : null}>
      {nameInitials(employee)}
    </Avatar.Fallback>
  </Avatar.Root>

  <div class="grid min-w-0 gap-0.5">
    <p
      class="font-medium flex items-center gap-2"
      class:text-muted-foreground={separated}
    >
      {fullName(employee)}
      {#if globalCtx.user.employee.employeePk === employee.employeePk}
        <Badge variant="secondary">You</Badge>
      {/if}
    </p>
    <span class="truncate text-xs text-muted-foreground">
      {employee.positionTitle}
    </span>
  </div>
</div>
