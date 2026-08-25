<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { capitalize } from "@/utils";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { getOrgUnitContext } from "./context.svelte.js";

  const ctx = getOrgUnitContext();
  let node = $derived(ctx.orgUnitToEdit);
  let submitting = $state(false);
  let errorMessage: string | null = $state(null);
</script>

<AlertDialog.Root
  bind:open={ctx.deleteAlertDialog}
  onOpenChangeComplete={() => {
    // Reset orgUnitToEdit
    // This block only runs when it closes — shadcn bug
    ctx.resetFormInputValues();
    errorMessage = null;
  }}
>
  <AlertDialog.Content>
    <form
      action="?/delete"
      method="POST"
      class="gap-4 grid w-full"
      use:enhance={() => {
        submitting = true;
        errorMessage = null;

        return async ({ result, update }) => {
          if (result.type === "success" && result.data?.deleted && node) {
            ctx.removeOrgUnit(node.orgUnitPk);
            toast.success(`${node.orgUnitName} deleted`);
            ctx.deleteAlertDialog = false;
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
      <input type="hidden" name="orgUnitPk" value={node?.orgUnitPk} />
      <input type="hidden" name="level" value={node?.level} />

      <AlertDialog.Header>
        <AlertDialog.Title
          >Delete {capitalize(node?.level ?? "")}?</AlertDialog.Title
        >
        <AlertDialog.Description>
          This will permanently delete "{node?.orgUnitName}". This action cannot
          be undone.
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
              <Alert.Title>Can't delete this {node?.level}</Alert.Title>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Root>
          </div>
        </div>
      {/if}

      <AlertDialog.Footer>
        <AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          type="submit"
          variant="destructive"
          disabled={submitting}
        >
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </form>
  </AlertDialog.Content>
</AlertDialog.Root>
