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
    type RoleKind,
  } from "$lib/rbac/permission-tree";
  import type { PERMISSIONS } from "$lib/server/permissions";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { Lock, ShieldCheck, SquarePen } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getRolesContext, type RoleRow } from "./context.svelte.js";
  import PermissionPicker from "./permission-picker.svelte";
  import PermissionSummary from "./permission-summary.svelte";

  let { permissionDefs }: { permissionDefs: typeof PERMISSIONS } = $props();

  const DESCRIPTION_MAX_LENGTH = 255;
  const DESCRIPTION_WARN_REMAINING = 20;

  const KIND_CHOICES: {
    kind: RoleKind;
    label: string;
    blurb: string;
    icon: typeof ShieldCheck;
  }[] = [
    {
      kind: "admin",
      label: "Admin role",
      blurb: "Works in the admin area: records, users, and org structure.",
      icon: ShieldCheck,
    },
    {
      kind: "staff",
      label: "Staff role",
      blurb: "Works in the staff pages, where consumption data is entered.",
      icon: SquarePen,
    },
  ];

  const ctx = getRolesContext();

  let submitting = $state(false);
  const formAction = $derived(ctx.mode === "edit" ? "?/update" : "?/create");

  /**
   * Only one half of the permission list is ever on screen. A role is either
   * an admin role or a staff role — holding admin:view sends the user into
   * /admin, so a staff key on an admin role could never be exercised.
   */
  const tree = $derived<PermissionGroup[]>(
    ctx.formKind ? buildPermissionTree(permissionDefs, ctx.formKind) : [],
  );

  const index = $derived(indexPermissionTree(tree));

  /**
   * The frozen role is shown with everything it holds, the Roles page
   * included — visible so an admin can see what it does, with nothing to
   * click.
   */
  const frozenTree = $derived<PermissionGroup[]>(
    ctx.editingIsFrozen
      ? buildPermissionTree(permissionDefs, "admin", { includeRestricted: true })
      : [],
  );

  const templatesForKind = $derived(
    ctx.templates.filter((t) => t.kind === ctx.formKind),
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
    ctx.formPermissions = toggleGroup(
      index,
      ctx.formPermissions,
      group,
      checked,
    );
  }
</script>

<Dialog.Root
  bind:open={ctx.addEditDialog}
  onOpenChangeComplete={() => {
    ctx.resetFormInputValues();
  }}
>
  <Dialog.Content class="sm:max-w-2xl">
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
            toast.error(errorMessage);
          }

          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title class="flex items-center gap-2">
          {dialogTitle}
          {#if ctx.editingIsFrozen}
            <Badge variant="secondary"><Lock /> Locked</Badge>
          {/if}
        </Dialog.Title>
        <Dialog.Description>
          {#if ctx.editingIsFrozen}
            This is the only role that can manage roles, so it is kept as it
            is. You can update its description; everything else is fixed.
          {:else}
            Name the role and pick what it can do. Users are assigned this role
            from the Users page.
          {/if}
        </Dialog.Description>
      </Dialog.Header>

      {#if ctx.roleToEdit}
        <input type="hidden" name="rolePk" value={ctx.roleToEdit.rolePk} />
      {/if}
      <input
        type="hidden"
        name="status"
        value={ctx.formIsActive ? "active" : "inactive"}
      />
      {#if ctx.formKind}
        <input type="hidden" name="kind" value={ctx.formKind} />
      {/if}
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
            aria-describedby={ctx.editingIsFrozen ? "roleNameLocked" : undefined}
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
              <Alert.Title>Every admin page, always</Alert.Title>
              <Alert.Description>
                This role keeps full access so there is always someone who can
                manage roles and users. New admin pages are added to it
                automatically.
              </Alert.Description>
            </Alert.Root>

            <ScrollArea
              type="always"
              viewPortClasses="max-h-[45vh] overflow-y-auto pr-3"
            >
              <PermissionSummary
                tree={frozenTree}
                selected={ctx.roleToEdit?.permissions ?? []}
              />
            </ScrollArea>
          </div>
        {:else}
          <!--
            Which kind of role this is decides which half of the permission
            list appears. Asked before anything is ticked when creating, and
            fixed once the role holds permissions — switching it later would
            mean discarding everything the role currently grants.
          -->
          <div class="grid gap-2">
            <Label>Where this role works</Label>

            {#if ctx.mode === "edit" && ctx.formKind}
              <p class="text-sm text-muted-foreground">
                {ctx.formKind === "admin"
                  ? "Admin role — works in the admin area."
                  : "Staff role — works in the staff pages."}
                To move it to the other side, create a new role instead.
              </p>
            {:else}
              <div class="grid gap-2 sm:grid-cols-2">
                {#each KIND_CHOICES as choice (choice.kind)}
                  {@const Icon = choice.icon}
                  <button
                    type="button"
                    onclick={() => ctx.chooseKind(choice.kind)}
                    aria-pressed={ctx.formKind === choice.kind}
                    class="flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5"
                  >
                    <Icon class="mt-0.5 size-4 shrink-0" />
                    <span class="grid gap-0.5">
                      <span class="text-sm font-medium">{choice.label}</span>
                      <span class="text-xs text-muted-foreground">
                        {choice.blurb}
                      </span>
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          {#if ctx.mode === "add" && ctx.formKind && templatesForKind.length}
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
                  const template = templatesForKind.find(
                    (t) => t.roleName === name,
                  );
                  if (template) ctx.applyTemplate(template);
                }}
              >
                <Select.Trigger id="template" class="w-full">
                  {ctx.formTemplateName ?? "Choose a starting point"}
                </Select.Trigger>
                <Select.Content>
                  {#each templatesForKind as template (template.roleName)}
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
              {#if ctx.formKind}
                <span class="text-xs text-muted-foreground">
                  {ctx.formPermissions.length} selected
                </span>
              {/if}
            </div>

            {#if !ctx.formKind}
              <p
                class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
              >
                Choose where this role works first, and the things it can do
                will appear here.
              </p>
            {:else}
              <ScrollArea
                type="always"
                viewPortClasses="max-h-[45vh] overflow-y-auto pr-3"
              >
                <PermissionPicker
                  {tree}
                  selected={ctx.formPermissions}
                  onToggleKey={handleToggleKey}
                  onToggleGroup={handleToggleGroup}
                />
              </ScrollArea>
              <p class="text-xs text-muted-foreground">
                Ticking something also ticks the page it lives on — you can't
                manage a page you can't open.
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <Dialog.Footer>
        {#if ctx.mode === "edit" && !ctx.editingIsFrozen}
          <div class="flex items-center space-x-2 mr-auto max-sm:order-1">
            <Switch id="isActive" bind:checked={ctx.formIsActive} />
            <Label for="isActive">Active</Label>
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
          disabled={submitting || (!ctx.editingIsFrozen && !ctx.formKind)}
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
