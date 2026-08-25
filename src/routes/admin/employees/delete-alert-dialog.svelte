<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { fullName, getEmployeesContext } from "./context.svelte.js";

  const ctx = getEmployeesContext();

  const employeeToDelete = $derived(ctx.employeeToEdit);
  let submitting = $state(false);
  let errorMessage: string | null = $state(null);
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
            employeeToDelete
          ) {
            ctx.removeEmployee(employeeToDelete.employeePk);
            toast.success(`${fullName(employeeToDelete)} deleted`);
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
      <input
        type="hidden"
        name="employeePk"
        value={employeeToDelete?.employeePk}
      />

      <AlertDialog.Header>
        <AlertDialog.Title>Delete this employee?</AlertDialog.Title>
        <AlertDialog.Description>
          This permanently removes the record for "{employeeToDelete
            ? fullName(employeeToDelete)
            : ''}" and cannot be undone. If this person has left the office, mark
          them as no longer employed instead — that keeps their record for anything
          they signed or submitted.
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
              <Alert.Title>Can't delete this employee</Alert.Title>
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
