<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import {
    buildPermissionTree,
    indexPermissionTree,
    togglePermission,
    toggleGroup,
    type PermissionGroup,
  } from "$lib/rbac/permission-tree";
  import type { PERMISSIONS } from "$lib/server/permissions";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { Lock, ShieldCheck } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getRolesContext, type RoleRow } from "./context.svelte.js";
  import PermissionPicker from "./permission-picker.svelte";
  import PermissionSummary from "./permission-summary.svelte";

  let { permissionDefs }: { permissionDefs: typeof PERMISSIONS } = $props();

  const DESCRIPTION_MAX_LENGTH = 255;
  const DESCRIPTION_WARN_REMAINING = 20;

  const ctx = getRolesContext();

  let submitting = $state(false);
  const formAction = $derived(ctx.mode === "edit" ? "?/update" : "?/create");

  /** Every key a role may be given, under the name of the page it opens. */
  const tree = $derived<PermissionGroup[]>(buildPermissionTree(permissionDefs));

  const index = $derived(indexPermissionTree(tree));

  /**
   * The frozen role is shown with everything it holds, the Roles page
   * included — visible so an admin can see what it does, with nothing to
   * click.
   */
  const frozenTree = $derived<PermissionGroup[]>(
    ctx.editingIsFrozen
      ? buildPermissionTree(permissionDefs, { includeRestricted: true })
      : [],
  );

  const dialogTitle = $derived(
    ctx.editingIsFrozen
      ? ctx.formRoleName
      : ctx.mode === "edit"
        ? "Edit role"
        : "Add role",
  );

  function handleToggleKey(key: string, checked: boolean) {
    ctx.formPermissions = togglePermission(
      index,
      ctx.formPermissions,
      key,
      checked,
    );
  }

  function handleToggleGroup(group: PermissionGroup, checked: boolean) {
    ctx.formPermissions = toggleGroup(ctx.formPermissions, group, checked);
  }
</script>

<Dialog.Root
  bind:open={ctx.addEditDialog}
  onOpenChangeComplete={(open) => {
    if (open) return;

    ctx.resetFormInputValues();
  }}
>
  <Dialog.Content class="px-0">
    <form
      class="grid gap-4"
      method="POST"
      action={formAction}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          const isEditing = ctx.mode === "edit";
          if (result.type === "success") {
            if (!isEditing && result.data?.newRow) {
              ctx.addRole(result.data.newRow as RoleRow);
            }

            if (isEditing && result.data?.updatedRow) {
              ctx.updateRole(result.data.updatedRow as RoleRow);
            }

            toast.success(`${isEditing ? "Updated" : "Added"} successfully`);
            ctx.addEditDialog = false;
          }

          if (result.type === "failure") {
            const errorMessage =
              (result.data as { error?: string } | undefined)?.error ??
              "Something went wrong.";
            toast.error("Role not saved", { description: errorMessage });
          }

          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <Dialog.Header class="px-4">
        <Dialog.Title class="flex items-center gap-2">
          {dialogTitle}
          {#if ctx.editingIsFrozen}
            <Badge variant="secondary"><Lock /> Locked</Badge>
          {/if}
        </Dialog.Title>
        <Dialog.Description>
          {#if ctx.editingIsFrozen}
            This is the only role that can manage roles, so it is kept as it is.
            You can update its description; everything else is fixed.
          {:else}
            Name the role and pick what it can do. Users are assigned this role
            from the Users page.
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      <ScrollArea
        viewPortClasses="px-4 size-full max-h-[calc(100vh-14rem)]"
        class=" "
      >
        {#if ctx.roleToEdit}
          <input type="hidden" name="rolePk" value={ctx.roleToEdit.rolePk} />
        {/if}
        <input
          type="hidden"
          name="status"
          value={ctx.formIsActive ? "active" : "inactive"}
        />
        {#if !ctx.editingIsFrozen}
          {#each ctx.formPermissions as key (key)}
            <input type="hidden" name="permissions" value={key} />
          {/each}
        {/if}

        <div class="grid gap-4">
          <div class="grid gap-2">
            <Label for="roleName">Role name</Label>
            <Input
              id="roleName"
              name="roleName"
              required
              readonly={ctx.editingIsFrozen}
              aria-describedby={ctx.editingIsFrozen
                ? "roleNameLocked"
                : undefined}
              class={ctx.editingIsFrozen ? "text-muted-foreground" : undefined}
              bind:value={ctx.formRoleName}
            />
            {#if ctx.editingIsFrozen}
              <p id="roleNameLocked" class="text-xs text-muted-foreground">
                This name can't be changed.
              </p>
            {/if}
          </div>

          <div class="grid gap-2">
            <Label for="description" class="gap-1">
              Description <span class="text-muted-foreground"
                >&lpar;Optional&rpar;</span
              >
            </Label>
            <Textarea
              id="description"
              name="description"
              maxlength={DESCRIPTION_MAX_LENGTH}
              bind:value={ctx.formDescription}
            />
            {#if DESCRIPTION_MAX_LENGTH - ctx.formDescription.length <= DESCRIPTION_WARN_REMAINING}
              <span class="text-xs text-muted-foreground text-right">
                {ctx.formDescription.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            {/if}
          </div>

          {#if ctx.editingIsFrozen}
            <div class="grid gap-3">
              <Label>What this role can do</Label>
              <Alert.Root>
                <ShieldCheck />
                <Alert.Title>Everything, always</Alert.Title>
                <Alert.Description>
                  This role keeps full access so there is always someone who can
                  manage roles and users. New pages are added to it
                  automatically.
                </Alert.Description>
              </Alert.Root>

              <!-- <ScrollArea
                type="always"
                viewPortClasses="max-h-[45vh] overflow-y-auto pr-3"
              > -->
              <PermissionSummary
                tree={frozenTree}
                selected={ctx.roleToEdit?.permissions ?? []}
              />
              <!-- </ScrollArea> -->
            </div>
          {:else}
            {#if ctx.mode === "add" && ctx.templates.length}
              <div class="grid gap-2">
                <Label for="template" class="gap-1">
                  Start from a common set <span class="text-muted-foreground"
                    >&lpar;Optional&rpar;</span
                  >
                </Label>
                <Select.Root
                  type="single"
                  value={ctx.formTemplateName ?? ""}
                  onValueChange={(name) => {
                    const template = ctx.templates.find(
                      (t) => t.roleName === name,
                    );
                    if (template) ctx.applyTemplate(template);
                  }}
                >
                  <Select.Trigger id="template" class="w-full">
                    {ctx.formTemplateName ?? "Choose a starting point"}
                  </Select.Trigger>
                  <Select.Content>
                    {#each ctx.templates as template (template.roleName)}
                      <Select.Item
                        value={template.roleName}
                        label={template.roleName}
                      >
                        {template.roleName}
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
                <p class="text-xs text-muted-foreground">
                  Fills in the tick boxes below as a starting point. Change
                  anything you like before saving.
                </p>
              </div>
            {/if}

            <div class="grid gap-3">
              <div class="flex items-center justify-between gap-2">
                <Label>What this role can do</Label>
                <span class="text-xs text-muted-foreground">
                  {ctx.formPermissions.length} selected
                </span>
              </div>

              <!-- <ScrollArea
                type="always"
                viewPortClasses="max-h-[45vh] overflow-y-auto pr-3"
              > -->
              <PermissionPicker
                {tree}
                selected={ctx.formPermissions}
                onToggleKey={handleToggleKey}
                onToggleGroup={handleToggleGroup}
              />
              <!-- </ScrollArea> -->
              <p class="text-xs text-muted-foreground">
                Ticking something also ticks the page it lives on — you can't
                manage a page you can't open.
              </p>
            </div>
          {/if}
        </div>
      </ScrollArea>
      <Dialog.Footer class="mx-0">
        {#if ctx.mode === "edit" && !ctx.editingIsFrozen}
          {@const blockers = ctx.usersBlockingSwitchOff}
          <div class="grid gap-1 mr-auto max-sm:order-1">
            <div class="flex items-center space-x-2">
              <Switch
                id="isActive"
                bind:checked={ctx.formIsActive}
                disabled={blockers > 0}
              />
              <Label for="isActive">Active</Label>
            </div>
            {#if blockers > 0}
              <p class="text-xs text-muted-foreground max-w-64">
                {blockers === 1 ? "1 user is" : `${blockers} users are`} assigned
                to this role. Move them to another role on the Users page to switch
                it off.
              </p>
            {/if}
          </div>
        {/if}

        <Dialog.Close
          disabled={submitting}
          type="button"
          class={buttonVariants({ variant: "outline" })}
        >
          {ctx.editingIsFrozen ? "Close" : "Cancel"}
        </Dialog.Close>
        <Button
          disabled={submitting}
          type="submit"
        >
          {#if submitting}
            <Spinner />
          {/if}
          {ctx.mode === "edit" ? "Save changes" : "Add role"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
