<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import {
    EllipsisVertical,
    KeyRound,
    LockOpen,
    Pencil,
    Trash2,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import {
    isTemporarilyLocked,
    getUsersContext,
    type UserRow,
  } from "./context.svelte.js";

  let { user }: { user: UserRow } = $props();

  const ctx = getUsersContext();
  const gblCtx = getGlobalContext();

  let unlockForm: HTMLFormElement | null = $state(null);

  const isSelf = $derived(ctx.isSelf(user));
  const locked = $derived(isTemporarilyLocked(user));

  /**
   * Handing over a new password is a way into that account, so it follows the
   * same boundary as assigning the role does: only somebody already on the
   * role that manages roles may reset the password of anybody on it.
   */
  const canResetPassword = $derived(
    !ctx.isSuperAdminRole(user.roleFk) || ctx.canManageRoles,
  );

  // Deleting the last active account that can manage roles is refused by the
  // server; the item is left out here so it is not offered in the first place.
  const canDelete = $derived(
    !isSelf &&
      ctx.impactOfLeaving(user, false) !== "block" &&
      (!ctx.isSuperAdminRole(user.roleFk) || ctx.canManageRoles),
  );
</script>

{#if gblCtx.can("admin:manage_users")}
  <form
    bind:this={unlockForm}
    method="POST"
    action="?/unlock"
    class="hidden"
    use:enhance={() => {
      return async ({ result, update }) => {
        if (result.type === "success" && result.data?.updatedRow) {
          ctx.updateUser(result.data.updatedRow as UserRow);
          toast.success("Account unlocked");
        }

        if (result.type === "failure") {
          toast.error(
            (result.data as { error?: string } | undefined)?.error ??
              "Something went wrong.",
          );
        }

        await update({ reset: false });
      };
    }}
  >
    <input type="hidden" name="userPk" value={user.userPk} />
  </form>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="ghost" size="icon" class="size-8">
          <EllipsisVertical />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end" class="w-full">
      <DropdownMenu.Item
        onclick={() => {
          ctx.userToEdit = user;
          ctx.addEditDialog = true;
        }}
      >
        <Pencil /> Edit
      </DropdownMenu.Item>

      {#if locked}
        <DropdownMenu.Item onclick={() => unlockForm?.requestSubmit()}>
          <LockOpen /> Unlock
        </DropdownMenu.Item>
      {/if}

      {#if canResetPassword}
        <DropdownMenu.Item
          onclick={() => {
            ctx.userToEdit = user;
            ctx.resetPasswordDialog = true;
          }}
        >
          <KeyRound /> Reset password
        </DropdownMenu.Item>
      {/if}

      {#if canDelete}
        <DropdownMenu.Item
          variant="destructive"
          onclick={() => {
            ctx.userToEdit = user;
            ctx.deleteAlertDialog = true;
          }}
        >
          <Trash2 /> Delete
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
