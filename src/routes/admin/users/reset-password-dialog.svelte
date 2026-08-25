<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { getPasswordStrengthError } from "$lib/validation/password";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { fullName, getUsersContext, type UserRow } from "./context.svelte.js";

  const ctx = getUsersContext();

  const userToReset = $derived(ctx.userToEdit);

  let submitting = $state(false);
  let errorMessage: string | null = $state(null);

  const passwordProblem = $derived(
    ctx.formSetPasswordManually && ctx.formPassword
      ? getPasswordStrengthError(ctx.formPassword)
      : "",
  );
</script>

<Dialog.Root
  bind:open={ctx.resetPasswordDialog}
  onOpenChangeComplete={() => {
    ctx.resetFormInputValues();
    errorMessage = null;
  }}
>
  <Dialog.Content class="sm:max-w-lg">
    <form
      class="grid w-full gap-4"
      method="POST"
      action="?/resetPassword"
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        errorMessage = null;

        return async ({ result, update }) => {
          if (result.type === "success" && result.data?.updatedRow) {
            const updatedRow = result.data.updatedRow as UserRow;
            ctx.updateUser(updatedRow);

            if (result.data.temporaryPassword) {
              ctx.showTemporaryPassword(
                result.data.temporaryPassword as string,
                updatedRow,
              );
            }

            toast.success("Password reset");
            ctx.resetPasswordDialog = false;
          }

          if (result.type === "failure") {
            errorMessage =
              (result.data as { error?: string } | undefined)?.error ??
              "Something went wrong.";
          }

          submitting = false;
          await update({ reset: false });
        };
      }}
    >
      <input type="hidden" name="userPk" value={userToReset?.userPk} />

      <Dialog.Header>
        <Dialog.Title>Reset password</Dialog.Title>
        <Dialog.Description>
          {userToReset ? fullName(userToReset.employee) : "This person"} will be given a new
          temporary password and asked to set their own the next time they sign in.
        </Dialog.Description>
      </Dialog.Header>

      <Alert.Root variant="info">
        <AlertCircleIcon />
        <Alert.Description>
          This signs them out everywhere and their current password stops
          working straight away.
        </Alert.Description>
      </Alert.Root>

      <div class="grid gap-3 rounded-lg border p-3">
        <div class="flex items-center justify-between gap-2">
          <Label for="setResetPassword" class="font-normal">
            Set the new password myself
          </Label>
          <Switch
            id="setResetPassword"
            bind:checked={ctx.formSetPasswordManually}
          />
        </div>

        {#if ctx.formSetPasswordManually}
          <div class="grid gap-2">
            <Input
              id="resetPassword"
              name="password"
              type="text"
              autocomplete="new-password"
              placeholder="Type a temporary password"
              bind:value={ctx.formPassword}
            />
            {#if passwordProblem}
              <p class="text-xs text-destructive">{passwordProblem}</p>
            {:else}
              <p class="text-xs text-muted-foreground">
                At least 8 characters, with an uppercase and a lowercase letter,
                a number, and a symbol.
              </p>
            {/if}
          </div>
        {:else}
          <p class="text-xs text-muted-foreground">
            A temporary password will be generated and shown once, so you can
            hand it over.
          </p>
        {/if}
      </div>

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
              <Alert.Title>Can't reset this password</Alert.Title>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Root>
          </div>
        </div>
      {/if}

      <Dialog.Footer>
        <Dialog.Close
          disabled={submitting}
          type="button"
          class={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Dialog.Close>
        <Button type="submit" disabled={submitting || !!passwordProblem}>
          {#if submitting}
            <Spinner />
          {/if}
          Reset password
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
