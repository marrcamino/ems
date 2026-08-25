<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { fullName, getUsersContext } from "./context.svelte.js";

  const ctx = getUsersContext();

  const userToDelete = $derived(ctx.userToEdit);
  let submitting = $state(false);
  let errorMessage: string | null = $state(null);

  /**
   * Deleting the last active account that can manage roles is refused by the
   * server. Saying so before the button is pressed is kinder than letting it
   * fail, and the second-to-last one is worth a word too.
   */
  const impact = $derived(
    userToDelete ? ctx.impactOfLeaving(userToDelete, false) : "none",
  );
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
      class="grid w-full gap-4"
      use:enhance={() => {
        submitting = true;
        errorMessage = null;

        return async ({ result, update }) => {
          if (
            result.type === "success" &&
            result.data?.deleted &&
            userToDelete
          ) {
            ctx.removeUser(userToDelete.userPk);
            toast.success(`${fullName(userToDelete.employee)} deleted`);
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
      <input type="hidden" name="userPk" value={userToDelete?.userPk} />

      <AlertDialog.Header>
        <AlertDialog.Title>Delete this account?</AlertDialog.Title>
        <AlertDialog.Description>
          This permanently deletes the account for "{userToDelete
            ? fullName(userToDelete.employee)
            : ""}" and signs them out. It cannot be undone. To keep the account
          but stop them signing in, set it to inactive instead.
        </AlertDialog.Description>
      </AlertDialog.Header>

      {#if impact === "block"}
        <Alert.Root variant="danger">
          <AlertCircleIcon />
          <Alert.Title>This is the last account that can manage roles</Alert.Title>
          <Alert.Description>
            Deleting it would leave nobody able to manage roles. Set up another
            account on this role first.
          </Alert.Description>
        </Alert.Root>
      {:else if impact === "warn"}
        <Alert.Root variant="info">
          <AlertCircleIcon />
          <Alert.Title>One account will be left</Alert.Title>
          <Alert.Description>
            After this, only one active account will be able to manage roles.
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
              <Alert.Title>Can't delete this account</Alert.Title>
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
          disabled={submitting || impact === "block"}
        >
          Delete
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </form>
  </AlertDialog.Content>
</AlertDialog.Root>
