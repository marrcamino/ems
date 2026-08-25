<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { EllipsisVertical, Pencil, Trash2, UserMinus } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import {
    getEmployeesContext,
    hasLogin,
    type EmployeeRow,
  } from "./context.svelte.js";

  let { employee }: { employee: EmployeeRow } = $props();

  const ctx = getEmployeesContext();
  const gblCtx = getGlobalContext();

  let separateForm: HTMLFormElement | null = $state(null);

  const employed = $derived(employee.employmentStatus === "active");

  // Deleting somebody who has a login is refused by the server, because the
  // account points at this row. Left out here so it is not offered first and
  // explained afterwards.
  const canDelete = $derived(!hasLogin(employee));
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
            toast.warning("Marked as no longer employed", {
              description: `Their account "${login.username}" can still sign in. Switch it off on the Users page.`,
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

      {#if employed}
        <DropdownMenu.Item onclick={() => separateForm?.requestSubmit()}>
          <UserMinus /> Mark as no longer employed
        </DropdownMenu.Item>
      {/if}

      {#if canDelete}
        <DropdownMenu.Item
          variant="destructive"
          onclick={() => {
            ctx.employeeToEdit = employee;
            ctx.deleteAlertDialog = true;
          }}
        >
          <Trash2 /> Delete
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
