<script lang="ts">
  import { capitalize } from "@/utils";
  import { getUsersContext, type UserRow } from "./context.svelte.js";

  let { user }: { user: UserRow } = $props();

  const ctx = getUsersContext();

  // The section belongs to the person, not the login, so it is read from
  // the employee half of the row and edited on the Employees page.
  const person = $derived(user.employee);

  const unit = $derived(
    person.orgUnitFk === null ? undefined : ctx.orgUnitByPk(person.orgUnitFk),
  );
</script>

{#if person.orgUnitName}
  <div class="grid gap-0.5">
    <span>{person.orgUnitAbbr ?? person.orgUnitName}</span>
    {#if unit}
      <span class="text-xs text-muted-foreground">
        {capitalize(unit.level)}{unit.status === "inactive" ? " · inactive" : ""}
      </span>
    {/if}
  </div>
{:else}
  <span class="text-muted-foreground">Not assigned</span>
{/if}
