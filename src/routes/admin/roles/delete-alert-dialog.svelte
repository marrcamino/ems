<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { getRolesContext } from "./context.svelte.js";

  const ctx = getRolesContext();
  let roleToDelete = $derived(ctx.roleToEdit);
  let submitting = $state(false);
  let errorMessage: string | null = $state(null);

  /**
   * The server refuses a role that still has users on it. Saying so before
   * the button is pressed is kinder than letting it fail, and the count is
   * already on the table row.
   */
  const assignedCount = $derived(roleToDelete?.userCount ?? 0);
</script>

<AlertDialog.Root
  bind:open={ctx.deleteAlertDialog}
  onOpenChangeComplete={() => {
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
          if (
            result.type === "success" &&
            result.data?.deleted &&
            roleToDelete
          ) {
            ctx.removeRole(roleToDelete.rolePk);
            toast.success(`${roleToDelete.roleName} deleted`);
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
      <input type="hidden" name="rolePk" value={roleToDelete?.rolePk} />

      <AlertDialog.Header>
        <AlertDialog.Title>Delete role?</AlertDialog.Title>
        <AlertDialog.Description>
          This will permanently delete "{roleToDelete?.roleName}". This action
          cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>

      {#if assignedCount > 0}
        <Alert.Root variant="danger">
          <AlertCircleIcon />
          <Alert.Title>
            {assignedCount === 1 ? "1 user is" : `${assignedCount} users are`} assigned
            to this role
          </Alert.Title>
          <Alert.Description>
            Move them to another role on the Users page first, then delete this
            one.
          </Alert.Description>
        </Alert.Root>
      {/if}

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
              <Alert.Title>Can't delete this role</Alert.Title>
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
          disabled={submitting || assignedCount > 0}
        >
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </form>
  </AlertDialog.Content>
</AlertDialog.Root>
