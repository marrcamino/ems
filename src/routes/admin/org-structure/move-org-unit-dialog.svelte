<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import type { OrgUnit } from "$lib/types";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { getOrgUnitContext, nextLevel } from "./context.svelte.js";

  const ctx = getOrgUnitContext();

  let moving = $derived(ctx.orgUnitToMove);
  let newParent = $derived(ctx.moveTargetParent);
  let currentParent = $derived(
    ctx.orgUnits.find((o) => o.orgUnitPk === moving?.parentFk) ?? null,
  );
  let childCount = $derived(
    moving
      ? ctx.orgUnits.filter((o) => o.parentFk === moving.orgUnitPk).length
      : 0,
  );

  let submitting = $state(false);
  let errorMessage: string | null = $state(null);
</script>

<AlertDialog.Root
  bind:open={ctx.moveDialog}
  onOpenChangeComplete={() => {
    ctx.orgUnitToMove = null;
    ctx.moveTargetParent = null;
    errorMessage = null;
  }}
>
  <AlertDialog.Content>
    <form
      action="?/move"
      method="POST"
      class="grid w-full gap-4"
      use:enhance={() => {
        submitting = true;
        errorMessage = null;
        const label = moving?.orgUnitName ?? "";
        const parentLabel = newParent?.orgUnitName ?? "";

        return async ({ result, update }) => {
          if (result.type === "success" && result.data?.movedRow) {
            ctx.updateOrgUnit(result.data.movedRow as OrgUnit);
            toast.success(`${label} is now under ${parentLabel}`);
            ctx.moveDialog = false;
          }

          if (result.type === "failure") {
            errorMessage =
              (result.data as { error?: string } | undefined)?.error ??
              "Something went wrong.";
          }

          submitting = false;
          await update();
        };
      }}
    >
      <input type="hidden" name="orgUnitPk" value={moving?.orgUnitPk} />
      <input type="hidden" name="newParentFk" value={newParent?.orgUnitPk} />

      <AlertDialog.Header>
        <AlertDialog.Title>Move {moving?.orgUnitName}?</AlertDialog.Title>
        <AlertDialog.Description>
          {#if currentParent}
            "{moving?.orgUnitName}" will be taken out of "{currentParent.orgUnitName}"
            and placed under "{newParent?.orgUnitName}".
          {:else}
            "{moving?.orgUnitName}" will be placed under "{newParent?.orgUnitName}".
          {/if}
          {#if childCount > 0 && moving}
            Everything under it moves with it, including {childCount}
            {nextLevel(moving.level)}{childCount > 1 ? "s" : ""}.
          {/if}
          You can move it back the same way.
        </AlertDialog.Description>
      </AlertDialog.Header>

      {#if errorMessage}
        <div
          in:slide={{ duration: 150 }}
          out:slide={{ delay: 200, duration: 200 }}
        >
          <div
            in:fade={{ duration: 200, delay: 200 }}
            out:fade={{ duration: 200 }}
          >
            <Alert.Root variant="danger">
              <AlertCircleIcon />
              <Alert.Title>Can't move this {moving?.level}</Alert.Title>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Root>
          </div>
        </div>
      {/if}

      <AlertDialog.Footer>
        <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
        <AlertDialog.Action type="submit" disabled={submitting}>
          Move
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </form>
  </AlertDialog.Content>
</AlertDialog.Root>
