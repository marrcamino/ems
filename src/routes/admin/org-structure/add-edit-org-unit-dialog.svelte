<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { OrgUnit } from "@/types";
  import { capitalize } from "@/utils";
  import { CircleQuestionMark, Info } from "@lucide/svelte/icons";
  import { tick, untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import { fade, slide } from "svelte/transition";
  import { getOrgUnitContext } from "./context.svelte";
  import AssignedEmployeesDialog from "./assigned-employees-dialog.svelte";
  import OrgUnitAssignedEmployees from "./org-unit-assigned-employees.svelte";

  const ctx = getOrgUnitContext();

  const levels: { label: string; value: OrgUnit["level"] }[] = [
    { label: "Office", value: "office" },
    { label: "Division", value: "division" },
    { label: "Section", value: "section" },
    { label: "Unit", value: "unit" },
  ] as const;

  let noOfficeYet = $state(false);
  let submitting = $state(false);
  let formAction = $derived(ctx.mode === "edit" ? "?/update" : "?/create");
  let levelIsAnOfficeOrDivision = $derived(
    ctx.formLevel === "office" ||
      ctx.formLevel === "division" ||
      !ctx.formLevel,
  );
  let orgUnitToEditIsInactive = $derived(
    ctx.orgUnitToEdit?.status === "inactive",
  );

  // Dialog open state changes
  $effect(() => {
    ctx.addEditDialog;
    untrack(async () => {
      await tick();
      if (!ctx.addEditDialog) return;

      if (ctx.orgUnits.length === 0) {
        ctx.formLevel = "office";
        noOfficeYet = true;
      }
    });
  });
</script>

<Dialog.Root
  bind:open={ctx.addEditDialog}
  onOpenChangeComplete={() => {
    // Reset inputs and values when close
    // This block only runs when it closes — shadcn bug
    ctx.resetFormInputValues();
    ctx.assignedEmployees = [];
    noOfficeYet = false;
  }}
>
  <Dialog.Content
    data-nested-open={ctx.assignedEmployeesDialog ? "" : null}
    class="sm:max-w-100 data-nested-open:scale-95 data-nested-open:-translate-y-[calc(50%+1.5rem)]"
  >
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
              ctx.addOrgUnit(result.data.newRow as OrgUnit);
            }

            if (isEditing && result.data?.updatedRow) {
              ctx.updateOrgUnit(result.data.updatedRow as OrgUnit);
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

          await update();
          submitting = false;
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {capitalize(ctx.mode)} Organization Unit
        </Dialog.Title>
        <Dialog.Description>
          Create a new division, section, or unit within your agency's
          organizational structure.
        </Dialog.Description>
      </Dialog.Header>

      {#if noOfficeYet}
        <div
          in:slide={{ duration: 150 }}
          out:slide={{ delay: 200, duration: 200 }}
        >
          <div
            in:fade={{ duration: 200, delay: 200 }}
            out:fade={{ duration: 200 }}
          >
            <Alert.Root variant="info">
              <Info />
              <Alert.Description>
                No office set up yet. Add your office below to get started —
                everything else builds underneath it.
              </Alert.Description>
            </Alert.Root>
          </div>
        </div>
      {/if}

      {#if ctx?.orgUnitToEdit?.status === "inactive"}
        <Alert.Root variant="info">
          <Info />
          <Alert.Title>This {ctx.orgUnitToEdit.level} is inactive</Alert.Title>
          <Alert.Description>
            Reactivate it to edit its informations. You can still toggle its
            status below.
          </Alert.Description>
        </Alert.Root>
      {/if}

      {#if ctx.orgUnitToEdit}
        <input
          type="hidden"
          name="orgUnitPk"
          value={ctx.orgUnitToEdit.orgUnitPk}
        />
      {/if}

      <div class="grid gap-4">
        <div class="grid gap-2">
          <Label class="flex-col items-start relative">
            <span>Level</span>
            <Select.Root
              type="single"
              bind:value={ctx.formLevel}
              disabled={noOfficeYet ||
                ctx.mode === "edit" ||
                orgUnitToEditIsInactive}
            >
              <Select.Trigger
                class="w-full max-w-92"
                disabled={noOfficeYet ||
                  ctx.mode === "edit" ||
                  orgUnitToEditIsInactive}
              >
                {levels.find(({ value }) => value === ctx.formLevel)?.label ??
                  "Select level"}
                <HiddenInput name="level" required value={ctx.formLevel} />
              </Select.Trigger>
              <Select.Content>
                {#each levels as { label, value }}
                  {@const isOfficeAndExist =
                    value !== "office" && !!ctx.orgUnits.length}
                  {#if isOfficeAndExist}
                    <Select.Item {value}>{label}</Select.Item>
                  {/if}
                {/each}
              </Select.Content>
            </Select.Root>
          </Label>
        </div>

        <div class="grid gap-2">
          <Label class="flex-col items-start relative">
            <p class="flex items-center gap-2">
              Parent
              {#if ctx.formLevel === "office"}
                <span
                  class="flex items-center gap-1 text-muted-foreground rounded-md border border-muted text-xs pl-1 pr-1.5 py-0.5"
                >
                  <Info class="size-3" />
                  Office has no parent
                </span>
              {/if}
            </p>

            <Select.Root
              type="single"
              disabled={levelIsAnOfficeOrDivision || orgUnitToEditIsInactive}
              bind:value={ctx.formParentFk}
            >
              <Select.Trigger
                class="w-full max-w-92"
                disabled={levelIsAnOfficeOrDivision || orgUnitToEditIsInactive}
              >
                {ctx.formParentName}

                {#if ctx.mode === "edit"}
                  <!-- UPDATE MODE -->
                  <HiddenInput
                    name="parentFk"
                    required={ctx.formLevel !== "office"}
                    value={ctx.formParentFk}
                  />
                {:else}
                  <!-- CREATE MODE -->
                  <HiddenInput
                    disabled={levelIsAnOfficeOrDivision}
                    name="parentFk"
                    required={ctx.formLevel !== "office"}
                    value={ctx.formParentFk}
                  />
                {/if}
              </Select.Trigger>
              <Select.Content>
                {#each ctx.formParentOrgUnits as p}
                  <Select.Item value={p.orgUnitPk.toString() ?? ""}>
                    {p.orgUnitName}
                  </Select.Item>
                {:else}
                  <div
                    class="d py-1 pr-8 pl-1.5 text-sm relative flex w-full cursor-default text-muted-foreground items-center outline-hidden select-none focus:bg-accent"
                  >
                    No parent to select
                  </div>
                {/each}
              </Select.Content>
            </Select.Root>
          </Label>
        </div>

        <div class="grid gap-2">
          <Label for="orgUnitName">Name</Label>
          <Input
            id="orgUnitName"
            name="orgUnitName"
            required
            disabled={orgUnitToEditIsInactive}
            bind:value={ctx.formOrgUnitName}
          />
        </div>

        <div class="grid gap-2">
          <Label for="abbr" class="gap-1"
            >Abbreviation <span class="text-muted-foreground"
              >&lpar;Optional&rpar;</span
            ></Label
          >
          <Input
            id="abbr"
            name="abbr"
            disabled={orgUnitToEditIsInactive}
            bind:value={ctx.formOrgUnitAbbr}
          />
        </div>

        <div>
          {#if ctx.mode === "edit" && !ctx.assignedEmployeesLoading}
            <div
              in:slide={{ duration: 150 }}
              out:slide={{ delay: 200, duration: 200 }}
            >
              <div
                in:fade={{ duration: 200, delay: 200 }}
                out:fade={{ duration: 200 }}
              >
                <OrgUnitAssignedEmployees />
              </div>
            </div>
          {/if}
        </div>
      </div>

      <Dialog.Footer>
        <input
          type="hidden"
          name="status"
          value={ctx.formIsActive ? "active" : "inactive"}
        />
        {#if ctx.formLevel !== "office"}
          <div class="flex items-center space-x-2 mr-auto max-sm:order-1">
            <Switch
              id="isActive"
              bind:checked={ctx.formIsActive}
              disabled={ctx.formStatusIsDisabled}
            />
            <Label for="isActive">Active</Label>

            {#if ctx.formStatusMessage.length}
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    class={buttonVariants({
                      variant: "ghost",
                      class:
                        "opacity-50 hover:bg-transparent dark:hover:bg-transparent p-0",
                    })}
                    aria-label="reason"
                  >
                    <CircleQuestionMark />
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>
                      {ctx.formStatusMessage}
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            {/if}
          </div>
        {/if}

        <Dialog.Close
          disabled={submitting}
          type="button"
          class={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Dialog.Close>
        <Button disabled={submitting} type="submit">
          {#if submitting}
            <Spinner />
          {/if}
          {ctx.mode === "edit" ? "Update" : "Add"}
        </Button>
      </Dialog.Footer>
    </form>

    <!-- NESTED DIALOG -->
    <AssignedEmployeesDialog />
  </Dialog.Content>
</Dialog.Root>
