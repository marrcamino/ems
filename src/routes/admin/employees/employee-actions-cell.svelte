<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import {
    EllipsisVertical,
    Pencil,
    RotateCcwClock,
    Trash2,
    UserMinus,
  } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import {
    fullName,
    getEmployeesContext,
    hasLogin,
    type EmployeeRow,
  } from "./context.svelte.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const ctx = getEmployeesContext();
  const gblCtx = getGlobalContext();

  let separateForm: HTMLFormElement | null = $state(null);

  const employed = $derived(employee.employmentStatus === "active");

  /**
   * Marking yourself, or the last person who can manage roles, as no longer
   * employed is refused by the server, because nobody could undo it from
   * here. The item stays in the menu with the reason under it, so the menu
   * keeps the same items for every employee. Somebody who already left has
   * nothing to mark, so the item is left out for them.
   */
  const separationImpact = $derived(ctx.impactOfSeparating(employee));
  const separateUnavailable = $derived(
    ctx.isSelf(employee)
      ? "Another admin must do this for you."
      : separationImpact === "block"
        ? "Another account must be able to manage roles first."
        : undefined,
  );

  // The second-to-last person who can manage roles may leave, but the admin
  // is told before rather than after.
  let confirmSeparate = $state(false);

  function separate() {
    if (separationImpact === "warn") {
      confirmSeparate = true;
    } else {
      separateForm?.requestSubmit();
    }
  }

  // Deleting somebody who has a login is refused by the server, because the
  // account points at this row. Shown with the reason rather than offered
  // first and explained afterwards.
  const deleteUnavailable = $derived(
    hasLogin(employee)
      ? `Delete the account "${employee.username}" on the Users page first.`
      : undefined,
  );
</script>

{#if gblCtx.can("admin:manage_employees")}
  <form
    bind:this={separateForm}
    method="POST"
    action="?/separate"
    class="hidden"
    use:enhance={() => {
      return async ({ result, update }) => {
        if (result.type === "success" && result.data?.updatedRow) {
          ctx.updateEmployee(result.data.updatedRow as EmployeeRow);

          const login = result.data.login as { username: string } | undefined;
          if (login) {
            toast.success("Marked as no longer employed", {
              description: `Their account "${login.username}" can no longer sign in, and they have been signed out.`,
            });
          } else {
            toast.success("Marked as no longer employed");
          }
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
    <input type="hidden" name="employeePk" value={employee.employeePk} />
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
          ctx.employeeToEdit = employee;
          ctx.addEditDialog = true;
        }}
      >
        <Pencil /> Edit
      </DropdownMenu.Item>

      <!--
        Recording a real change lives inside the history panel rather than here,
        so the entries already recorded are read before another one is added.
      -->
      <DropdownMenu.Item onclick={() => ctx.openHistoryFor(employee)}>
        <RotateCcwClock /> Name and position history
      </DropdownMenu.Item>

      {#if employed}
        <DropdownMenu.Separator />

        <DropdownMenu.Item
          unavailable={separateUnavailable}
          onclick={separate}
        >
          <UserMinus /> Mark as no longer employed
        </DropdownMenu.Item>
      {/if}

      <DropdownMenu.Separator />

      <DropdownMenu.Item
        variant="destructive"
        unavailable={deleteUnavailable}
        onclick={() => {
          ctx.employeeToEdit = employee;
          ctx.deleteAlertDialog = true;
        }}
      >
        <Trash2 /> Delete
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <AlertDialog.Root bind:open={confirmSeparate}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>
          Mark {fullName(employee)} as no longer employed?
        </AlertDialog.Title>
        <AlertDialog.Description>
          They will be signed out and can no longer sign in. After this, only
          one person who can sign in will be able to manage roles.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={() => {
            separateForm?.requestSubmit();
            confirmSeparate = false;
          }}
        >
          Mark as left
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
{/if}
