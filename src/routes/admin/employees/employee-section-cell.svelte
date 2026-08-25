<script lang="ts">
  import { capitalize } from "@/utils";
  import { getEmployeesContext, type EmployeeRow } from "./context.svelte.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const ctx = getEmployeesContext();

  const unit = $derived(
    employee.orgUnitFk === null
      ? undefined
      : ctx.orgUnitByPk(employee.orgUnitFk),
  );
</script>

{#if employee.orgUnitName}
  <div class="grid gap-0.5">
    <span>{employee.orgUnitAbbr ?? employee.orgUnitName}</span>
    {#if unit}
      <span class="text-xs text-muted-foreground">
        {capitalize(unit.level)}{unit.status === "inactive" ? " · inactive" : ""}
      </span>
    {/if}
  </div>
{:else}
  <span class="text-muted-foreground">Not assigned</span>
{/if}
