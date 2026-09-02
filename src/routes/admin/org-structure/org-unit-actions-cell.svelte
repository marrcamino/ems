<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import type { OrgUnit } from "$lib/types";
  import {
    CornerDownRight,
    EllipsisVertical,
    MoveRight,
    Pencil,
    Plus,
    Trash2,
  } from "@lucide/svelte/icons";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import { getOrgUnitContext, nextLevel } from "./context.svelte.js";
  import { moveRejectionReason } from "./move-rules.js";

  let { unit }: { unit: OrgUnit } = $props();

  const ctx = getOrgUnitContext();
  const gblCtx = getGlobalContext();

  const canManage = $derived(gblCtx.can("admin:manage_org_units"));
  const isInactive = $derived(unit.status === "inactive");

  // The same rules the canvas uses to decide whether a box may be dropped on
  // another one. Asking them here means the menu can only ever offer a move
  // the server would also accept.
  const moveTargets = $derived(
    ctx.orgUnits.filter((target) => moveRejectionReason(unit, target) === null),
  );

  function openAddDialog() {
    ctx.formLevel = nextLevel(unit.level);
    ctx.formParentFk = unit.orgUnitPk.toString();
    ctx.formParentName = unit.orgUnitName;
    ctx.addEditDialog = true;
  }

  function openEditDialog() {
    ctx.orgUnitToEdit = unit;
    ctx.addEditDialog = true;
  }

  function openDeleteDialog() {
    ctx.orgUnitToEdit = unit;
    ctx.deleteAlertDialog = true;
  }

  function openMoveDialog(target: OrgUnit) {
    ctx.orgUnitToMove = unit;
    ctx.moveTargetParent = target;
    ctx.moveDialog = true;
  }
</script>

{#if canManage}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="ghost" size="icon" class="size-8">
          <EllipsisVertical />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="w-max">
      <DropdownMenu.Item onclick={openEditDialog}>
        <Pencil /> Edit
      </DropdownMenu.Item>

      {#if unit.level !== "unit" && !isInactive}
        <DropdownMenu.Item onclick={openAddDialog}>
          <Plus /> Add a {nextLevel(unit.level)} under this
        </DropdownMenu.Item>
      {/if}

      <!-- Left out when there is nowhere to go: the office has no parent, and
           an inactive box can't be moved until it is set active again. -->
      {#if moveTargets.length}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>
            <MoveRight /> Move to
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent class="max-h-64 overflow-y-auto">
            {#each moveTargets as target (target.orgUnitPk)}
              <DropdownMenu.Item onclick={() => openMoveDialog(target)}>
                <CornerDownRight />
                {target.orgUnitName}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      {/if}

      {#if unit.level !== "office" && !isInactive}
        <DropdownMenu.Item variant="destructive" onclick={openDeleteDialog}>
          <Trash2 /> Delete
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
