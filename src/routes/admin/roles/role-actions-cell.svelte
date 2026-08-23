<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Eye, EllipsisVertical, Pencil, Trash2 } from "@lucide/svelte/icons";
  import { getGlobalContext } from "../../global-context.svelte.js";
  import { getRolesContext, type RoleRow } from "./context.svelte.js";

  let { role }: { role: RoleRow } = $props();

  const ctx = getRolesContext();
  const gblCtx = getGlobalContext();

  /**
   * The role holding admin:manage_roles cannot be deleted — dropping it would
   * leave nobody able to open this page. It still opens in the editor, which
   * shows what it holds and lets its description be updated.
   */
  const isFrozen = $derived(ctx.isSuperAdminRole(role));
</script>

{#if gblCtx.can("admin:manage_roles")}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="ghost" size="icon" class="size-8">
          <EllipsisVertical />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      <DropdownMenu.Item
        onclick={() => {
          ctx.roleToEdit = role;
          ctx.addEditDialog = true;
        }}
      >
        {#if isFrozen}
          <Eye /> View
        {:else}
          <Pencil /> Edit
        {/if}
      </DropdownMenu.Item>

      {#if !isFrozen}
        <DropdownMenu.Item
          variant="destructive"
          onclick={() => {
            ctx.roleToEdit = role;
            ctx.deleteAlertDialog = true;
          }}
        >
          <Trash2 /> Delete
        </DropdownMenu.Item>
      {/if}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
