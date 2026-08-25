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
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { fullName } from "@/utils";
  import { getPasswordStrengthError } from "$lib/validation/password";
  import { AlertCircle, Info, Lock, ShieldCheck } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getUsersContext, type UserRow } from "./context.svelte.js";
  import { roleAreaLabels } from "./filters.js";

  const ctx = getUsersContext();

  let submitting = $state(false);
  const formAction = $derived(ctx.mode === "edit" ? "?/update" : "?/create");

  const editingSelf = $derived(
    ctx.userToEdit !== null && ctx.isSelf(ctx.userToEdit),
  );

  const editingSuperAdminUser = $derived(
    ctx.userToEdit !== null && ctx.isSuperAdminRole(ctx.userToEdit.roleFk),
  );

  /**
   * Nobody changes their own role — it is how somebody promotes themselves,
   * and also how they accidentally drop themselves onto a role that can no
   * longer reach this page. Moving somebody off the role that manages roles
   * is limited the same way assigning it is.
   */
  const roleLocked = $derived(
    editingSelf || (editingSuperAdminUser && !ctx.canManageRoles),
  );

  const selectedRole = $derived(
    ctx.formRoleFk ? ctx.roleByPk(Number(ctx.formRoleFk)) : undefined,
  );

  const selectedRoleAreas = $derived(
    roleAreaLabels(selectedRole, ctx.permissionDefs),
  );

  const adminRoles = $derived(
    ctx.assignableRoles.filter((r) => ctx.kindOfRole(r.rolePk) === "admin"),
  );

  const staffRoles = $derived(
    ctx.assignableRoles.filter((r) => ctx.kindOfRole(r.rolePk) !== "admin"),
  );

  /**
   * Everybody, so somebody who already has an account still appears — greyed
   * out with the reason — rather than being silently missing from the list.
   */
  const peopleOptions = $derived(ctx.employees);

  /**
   * What saving this would do to the group of active accounts that can manage
   * roles. The server refuses the last one leaving outright; saying so here
   * means the admin finds out before pressing the button rather than after.
   */
  const superAdminImpact = $derived(
    ctx.mode === "edit" && ctx.userToEdit
      ? ctx.impactOfLeaving(
          ctx.userToEdit,
          ctx.formRoleFk === String(ctx.superAdminRolePk) && ctx.formIsActive,
        )
      : "none",
  );

  const passwordProblem = $derived(
    ctx.formSetPasswordManually && ctx.formPassword
      ? getPasswordStrengthError(ctx.formPassword)
      : "",
  );

  const canSubmit = $derived(
    !submitting &&
      superAdminImpact !== "block" &&
      !passwordProblem &&
      !!ctx.formRoleFk &&
      !!ctx.formEmployeeFk,
  );
</script>

<Dialog.Root
  bind:open={ctx.addEditDialog}
  onOpenChangeComplete={() => {
    ctx.resetFormInputValues();
  }}
>
  <Dialog.Content class="px-0 sm:max-w-125">
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
              const newRow = result.data.newRow as UserRow;
              ctx.addUser(newRow);

              // The generated password is readable exactly once — it is
              // stored only as a hash — so it is handed straight to the
              // notice that shows it.
              if (result.data.temporaryPassword) {
                ctx.showTemporaryPassword(
                  result.data.temporaryPassword as string,
                  newRow,
                );
              }
            }

            if (isEditing && result.data?.updatedRow) {
              ctx.updateUser(result.data.updatedRow as UserRow);
            }

            toast.success(isEditing ? "Changes saved" : "Account created");
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
      <Dialog.Header class="px-4">
        <Dialog.Title>
          {ctx.mode === "edit" ? "Edit account" : "Add account"}
        </Dialog.Title>
        <Dialog.Description>
          {ctx.mode === "edit"
            ? "Update the username, role, and whether this account can sign in. The name and section belong to the employee record and are edited on the Employees page."
            : "Give somebody who is already on the Employees page an account to sign in with. They will set their own password the first time they use it."}
        </Dialog.Description>
      </Dialog.Header>

      <ScrollArea viewPortClasses="px-4 size-full max-h-[calc(100vh-16rem)]">
        {#if ctx.userToEdit}
          <input type="hidden" name="userPk" value={ctx.userToEdit.userPk} />
        {/if}
        <input
          type="hidden"
          name="accountStatus"
          value={ctx.formIsActive ? "active" : "inactive"}
        />
        <input type="hidden" name="roleFk" value={ctx.formRoleFk} />
        <input type="hidden" name="employeeFk" value={ctx.formEmployeeFk} />

        <div class="grid gap-4">
          {#if superAdminImpact === "block"}
            <Alert.Root variant="danger">
              <AlertCircle />
              <Alert.Title
                >This is the last account that can manage roles</Alert.Title
              >
              <Alert.Description>
                Moving this person to another role, or switching their account
                off, would leave nobody able to manage roles. Set up another
                account on this role first.
              </Alert.Description>
            </Alert.Root>
          {:else if superAdminImpact === "warn"}
            <Alert.Root variant="info">
              <Info />
              <Alert.Title>One account will be left</Alert.Title>
              <Alert.Description>
                After this change, only one active account will be able to
                manage roles. If that one is lost, roles can only be recovered
                from the server.
              </Alert.Description>
            </Alert.Root>
          {/if}

          <div class="grid gap-2">
            <Label for="employee">Person</Label>
            {#if ctx.mode === "edit"}
              <!--
                A login cannot be handed to a different person: that is a new
                account, not an edit. Shown as plain text rather than a
                disabled dropdown, which would invite clicking.
              -->
              <div class="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <p class="font-medium">
                  {ctx.userToEdit ? fullName(ctx.userToEdit.employee) : ""}
                </p>
                {#if ctx.userToEdit?.employee.positionTitle}
                  <p class="text-xs text-muted-foreground">
                    {ctx.userToEdit.employee.positionTitle}
                  </p>
                {/if}
              </div>
              <p class="text-xs text-muted-foreground">
                An account stays with the person it was made for. To give
                somebody else an account, add a new one.
              </p>
            {:else}
              <Select.Root type="single" bind:value={ctx.formEmployeeFk}>
                <Select.Trigger id="employee" class="w-full">
                  {ctx.selectedEmployee
                    ? fullName(ctx.selectedEmployee)
                    : "Choose a person"}
                </Select.Trigger>
                <Select.Content>
                  {#each peopleOptions as person (person.employeePk)}
                    <Select.Item
                      value={String(person.employeePk)}
                      label={fullName(person)}
                      disabled={!ctx.employeeIsAvailable(person)}
                    >
                      <span class="grid gap-0.5">
                        <span>{fullName(person)}</span>
                        <span class="text-xs text-muted-foreground">
                          {#if person.username}
                            Already signs in as {person.username}
                          {:else if person.employmentStatus !== "active"}
                            No longer employed
                          {:else}
                            {person.positionTitle}
                          {/if}
                        </span>
                      </span>
                    </Select.Item>
                  {:else}
                    <p class="px-2 py-1.5 text-sm text-muted-foreground">
                      Nobody has been added yet.
                    </p>
                  {/each}
                </Select.Content>
              </Select.Root>

              {#if ctx.availableEmployeeCount === 0}
                <p class="text-xs text-muted-foreground">
                  Everybody on file already has an account. Add the person on
                  the Employees page first, then come back here.
                </p>
              {:else}
                <p class="text-xs text-muted-foreground">
                  Only people without an account can be picked. The name and
                  position come from their employee record.
                </p>
              {/if}
            {/if}
          </div>

          <div class="grid gap-2">
            <Label for="username">Username</Label>
            <Input
              id="username"
              name="username"
              required
              maxlength={50}
              placeholder="jdelacruz"
              bind:value={ctx.formUsername}
            />
            <p class="text-xs text-muted-foreground">
              What this person types to sign in. Letters, numbers, dots, dashes,
              and underscores only.
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="role">Role</Label>
            <Select.Root
              type="single"
              disabled={roleLocked}
              bind:value={ctx.formRoleFk}
            >
              <Select.Trigger id="role" class="w-full" disabled={roleLocked}>
                {selectedRole?.roleName ?? "Choose a role"}
              </Select.Trigger>
              <Select.Content>
                {#if adminRoles.length}
                  <Select.Group>
                    <Select.GroupHeading>Admin roles</Select.GroupHeading>
                    {#each adminRoles as role (role.rolePk)}
                      <Select.Item
                        value={String(role.rolePk)}
                        label={role.roleName}
                        disabled={!ctx.roleIsAssignable(role.rolePk)}
                      >
                        <span class="flex items-center gap-1.5">
                          {#if ctx.isSuperAdminRole(role.rolePk)}
                            <Lock class="size-3.5" />
                          {/if}
                          {role.roleName}
                        </span>
                      </Select.Item>
                    {/each}
                  </Select.Group>
                {/if}

                {#if staffRoles.length}
                  <Select.Group>
                    <Select.GroupHeading>Staff roles</Select.GroupHeading>
                    {#each staffRoles as role (role.rolePk)}
                      <Select.Item
                        value={String(role.rolePk)}
                        label={role.roleName}
                      >
                        {role.roleName}
                      </Select.Item>
                    {/each}
                  </Select.Group>
                {/if}
              </Select.Content>
            </Select.Root>

            {#if editingSelf}
              <p class="text-xs text-muted-foreground">
                You can't change your own role. Ask another admin to do it for
                you.
              </p>
            {:else if roleLocked}
              <p class="text-xs text-muted-foreground">
                Only someone already on this role can move this person off it.
              </p>
            {/if}

            <!--
              Whoever manages users cannot open the Roles page, so without this
              they would be picking a role by its name alone.
            -->
            {#if selectedRole}
              <div class="rounded-lg border bg-muted/30 p-3 text-sm">
                {#if selectedRole.description}
                  <p class="text-muted-foreground">
                    {selectedRole.description}
                  </p>
                {/if}

                <div class="mt-2 grid gap-1.5">
                  <span
                    class="text-xs font-medium text-muted-foreground uppercase"
                  >
                    Can open
                  </span>
                  {#if selectedRoleAreas.length}
                    <div class="flex flex-wrap gap-1">
                      {#each selectedRoleAreas as area (area)}
                        <Badge variant="outline">{area}</Badge>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-muted-foreground">
                      This role doesn't open any pages yet.
                    </span>
                  {/if}
                </div>

                {#if ctx.kindOfRole(selectedRole.rolePk) === "admin"}
                  <p
                    class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <ShieldCheck class="mt-0.5 size-3.5 shrink-0" />
                    An admin account. This person works in the admin area and won't
                    see the staff pages where records are entered.
                  </p>
                {/if}
              </div>
            {/if}
          </div>

          {#if ctx.mode === "add"}
            <div class="grid gap-3 rounded-lg border p-3">
              <div class="flex items-center justify-between gap-2">
                <Label for="setPassword" class="font-normal">
                  Set the first password myself
                </Label>
                <Switch
                  id="setPassword"
                  bind:checked={ctx.formSetPasswordManually}
                />
              </div>

              {#if ctx.formSetPasswordManually}
                <div class="grid gap-2">
                  <Input
                    id="password"
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
                      At least 8 characters, with an uppercase and a lowercase
                      letter, a number, and a symbol.
                    </p>
                  {/if}
                </div>
              {:else}
                <p class="text-xs text-muted-foreground">
                  A temporary password will be generated and shown once after
                  saving. Either way, this person sets their own password the
                  first time they sign in.
                </p>
              {/if}
            </div>
          {/if}
        </div>
      </ScrollArea>

      <Dialog.Footer class="mx-0 px-4">
        {#if ctx.mode === "edit"}
          <div class="mr-auto flex items-center space-x-2 max-sm:order-1">
            <Switch
              id="isActive"
              disabled={editingSelf}
              bind:checked={ctx.formIsActive}
            />
            <Label for="isActive">Active</Label>
          </div>
        {/if}

        <Dialog.Close
          disabled={submitting}
          type="button"
          class={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Dialog.Close>
        <Button disabled={!canSubmit} type="submit">
          {#if submitting}
            <Spinner />
          {/if}
          {ctx.mode === "edit" ? "Save changes" : "Add account"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
