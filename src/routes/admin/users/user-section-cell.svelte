<script lang="ts">
  import { capitalize } from "@/utils";
  import { getUsersContext, type UserRow } from "./context.svelte.js";

  let { user }: { user: UserRow } = $props();

  const ctx = getUsersContext();

  const unit = $derived(
    user.orgUnitFk === null ? undefined : ctx.orgUnitByPk(user.orgUnitFk),
  );
</script>

{#if user.orgUnitName}
  <div class="grid gap-0.5">
    <span>{user.orgUnitAbbr ?? user.orgUnitName}</span>
    {#if unit}
      <span class="text-xs text-muted-foreground">
        {capitalize(unit.level)}{unit.status === "inactive" ? " · inactive" : ""}
      </span>
    {/if}
  </div>
{:else}
  <span class="text-muted-foreground">Not assigned</span>
{/if}
