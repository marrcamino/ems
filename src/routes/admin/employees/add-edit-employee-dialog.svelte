<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import type { OrgUnit } from "$lib/types";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { capitalize } from "@/utils";
  import { Info, TriangleAlert } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getEmployeesContext, type EmployeeRow } from "./context.svelte.js";
  import DuplicateAlert from "./duplicate-alert.svelte";
  import {
    CIVIL_STATUS_LABELS,
    CIVIL_STATUS_VALUES,
    SEX_LABELS,
    SEX_VALUES,
    TENURE_STATUS_LABELS,
    TENURE_STATUS_VALUES,
  } from "./labels.js";

  const ctx = getEmployeesContext();

  let submitting = $state(false);
  const formAction = $derived(ctx.mode === "edit" ? "?/update" : "?/create");

  const LEVEL_ORDER: OrgUnit["level"][] = [
    "office",
    "division",
    "section",
    "unit",
  ];

  const sectionsByLevel = $derived(
    LEVEL_ORDER.map((level) => ({
      level,
      units: ctx.assignableOrgUnits.filter((unit) => unit.level === level),
    })).filter((group) => group.units.length > 0),
  );

  const selectedSection = $derived(
    ctx.formOrgUnitFk ? ctx.orgUnitByPk(Number(ctx.formOrgUnitFk)) : undefined,
  );

  // A date input will happily accept a year in the far future, so the field
  // is capped at today rather than left open.
  const today = new Date().toISOString().slice(0, 10);

  const canSubmit = $derived(
    !submitting &&
      !!ctx.formFirstName.trim() &&
      !!ctx.formLastName.trim() &&
      !!ctx.formPositionTitle.trim() &&
      !!ctx.formTenureStatus &&
      !!ctx.formBirthDate &&
      // An exact match is never saved as a new or renamed person. Where the
      // matched person has left, the way forward is the button inside the
      // alert instead of this one.
      ctx.duplicateFinding?.kind !== "exact" &&
      // A possible match may be saved, but only once it has been answered.
      (!ctx.possibleMatch || ctx.confirmedDifferentPerson),
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
            // Which row came back matters more than which mode the dialog was
            // in: bringing somebody back happens from the add form but updates
            // a row that already exists.
            const data = result.data as
              | {
                  newRow?: EmployeeRow;
                  updatedRow?: EmployeeRow;
                  reinstated?: boolean;
                }
              | undefined;

            if (data?.newRow) ctx.addEmployee(data.newRow);
            if (data?.updatedRow) ctx.updateEmployee(data.updatedRow);

            toast.success(
              data?.reinstated
                ? "This person is employed again"
                : isEditing
                  ? "Changes saved"
                  : "Employee added",
            );
            ctx.addEditDialog = false;
          }

          if (result.type === "failure") {
            toast.error(
              (result.data as { error?: string } | undefined)?.error ??
                "Something went wrong.",
            );
          }

          await update({ reset: false });
          submitting = false;
        };
      }}
    >
      <Dialog.Header class="px-4">
        <Dialog.Title>
          {ctx.mode === "edit" ? "Edit employee" : "Add employee"}
        </Dialog.Title>
        <Dialog.Description>
          {ctx.mode === "edit"
            ? "Update this person's details."
            : "Add a person to the office. Giving them an account to sign in with is a separate step, on the Users page."}
        </Dialog.Description>
      </Dialog.Header>

      <ScrollArea viewPortClasses="px-4 size-full max-h-[calc(100vh-16rem)]">
        {#if ctx.employeeToEdit}
          <input
            type="hidden"
            name="employeePk"
            value={ctx.employeeToEdit.employeePk}
          />
        {/if}
        <input
          type="hidden"
          name="employmentStatus"
          value={ctx.employmentStatusValue}
        />
        <input type="hidden" name="orgUnitFk" value={ctx.formOrgUnitFk} />
        <input type="hidden" name="sex" value={ctx.formSex} />
        <input type="hidden" name="civilStatus" value={ctx.formCivilStatus} />
        <input type="hidden" name="tenureStatus" value={ctx.formTenureStatus} />

        <div class="grid gap-4">
          <!--
            Shown only when something a document prints has been changed, so an
            ordinary edit to a birthday or a civil status stays silent. It does
            not block the save: if the admin reads it and carries on, that is
            their decision, and the point is that they were told.
          -->
          {#if ctx.mode === "edit" && ctx.printedFieldsChanged}
            <Alert.Root variant="warning">
              <TriangleAlert />
              <Alert.Title>This corrects the name everywhere</Alert.Title>
              <Alert.Description>
                {#if ctx.documentsAffectedByEdit === 0}
                  No document uses this name yet, so nothing else changes.
                {:else if ctx.documentsAffectedByEdit === 1}
                  1 document already uses this name, and it will show the
                  corrected name straight away.
                {:else}
                  {ctx.documentsAffectedByEdit} documents already use this name,
                  and all of them will show the corrected name straight away.
                {/if}
                <br /><br />
                If this person's name or position really changed, close this and
                use "Add name or position change" instead, so older documents keep
                the wording they were filed with.
              </Alert.Description>
            </Alert.Root>
          {/if}

          {#if ctx.leavingWithLogin}
            <Alert.Root variant="info">
              <Info />
              <Alert.Title>They will not be able to sign in</Alert.Title>
              <Alert.Description>
                Once you save this, their account stops working and they are
                signed out straight away. The account itself stays on the Users
                page, marked as belonging to somebody who has left.
              </Alert.Description>
            </Alert.Root>
          {/if}

          <div class="grid gap-2 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                maxlength={100}
                bind:value={ctx.formFirstName}
              />
            </div>

            <div class="grid gap-2">
              <Label for="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                maxlength={100}
                bind:value={ctx.formLastName}
              />
            </div>

            <div class="grid gap-2">
              <Label for="middleName" class="gap-1">
                Middle name
                <span class="text-muted-foreground">&lpar;Optional&rpar;</span>
              </Label>
              <Input
                id="middleName"
                name="middleName"
                maxlength={100}
                bind:value={ctx.formMiddleName}
              />
            </div>

            <div class="grid gap-2">
              <Label for="suffix" class="gap-1">
                Suffix
                <span class="text-muted-foreground">&lpar;Optional&rpar;</span>
              </Label>
              <Input
                id="suffix"
                name="suffix"
                maxlength={20}
                placeholder="Jr., Sr., III"
                bind:value={ctx.formSuffix}
              />
            </div>
          </div>

          <!--
            The birthday sits with the names rather than with the personal
            details, because it is no longer a personal detail: it is what
            tells two people with the same name apart, and the check below
            reads it.
          -->
          <div class="grid gap-2">
            <Label for="birthDate">Birthday</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              max={today}
              bind:value={ctx.formBirthDate}
            />
          </div>

          <DuplicateAlert {submitting} />

          <div class="grid gap-2">
            <Label for="positionTitle">Position title</Label>
            <Input
              id="positionTitle"
              name="positionTitle"
              required
              maxlength={100}
              placeholder="Administrative Officer III (Records Officer II)"
              bind:value={ctx.formPositionTitle}
            />
          </div>

          <div class="grid gap-2">
            <Label for="positionShortForm" class="gap-1">
              Abbreviated position title
              <span class="text-muted-foreground">&lpar;Optional&rpar;</span>
            </Label>
            <Input
              id="positionShortForm"
              name="positionShortForm"
              maxlength={50}
              placeholder="AO III (Records Officer II)"
              bind:value={ctx.formPositionShortForm}
            />
            <p class="text-xs text-muted-foreground">
              Used where space is limited — ID badges, tables, org charts, and
              printouts.
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="section" class="gap-1">
              Section
              <span class="text-muted-foreground">&lpar;Optional&rpar;</span>
            </Label>
            <Select.Root
              type="single"
              value={ctx.formOrgUnitFk || "none"}
              onValueChange={(value) => {
                ctx.formOrgUnitFk = value === "none" ? "" : value;
              }}
            >
              <Select.Trigger id="section" class="w-full">
                {selectedSection?.orgUnitName ?? "Not assigned"}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none" label="Not assigned">
                  Not assigned
                </Select.Item>
                {#each sectionsByLevel as group (group.level)}
                  <Select.Group>
                    <Select.GroupHeading>
                      {capitalize(group.level)}
                    </Select.GroupHeading>
                    {#each group.units as unit (unit.orgUnitPk)}
                      <Select.Item
                        value={String(unit.orgUnitPk)}
                        label={unit.orgUnitName}
                      >
                        {unit.orgUnitName}{unit.abbr ? ` (${unit.abbr})` : ""}
                      </Select.Item>
                    {/each}
                  </Select.Group>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

          <div class="grid gap-2">
            <Label for="tenureStatus">Tenure</Label>
            <Select.Root type="single" bind:value={ctx.formTenureStatus}>
              <Select.Trigger id="tenureStatus" class="w-full">
                {ctx.formTenureStatus
                  ? TENURE_STATUS_LABELS[
                      ctx.formTenureStatus as keyof typeof TENURE_STATUS_LABELS
                    ]
                  : "Choose one"}
              </Select.Trigger>
              <Select.Content>
                {#each TENURE_STATUS_VALUES as value (value)}
                  <Select.Item {value} label={TENURE_STATUS_LABELS[value]}>
                    {TENURE_STATUS_LABELS[value]}
                  </Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>

          <!--
            Personal details, kept out of the table on purpose: nobody scans a
            staff list looking for these, and they do not need to sit on screen
            where anybody walking past can read them.
          -->
          <div class="grid gap-3 rounded-lg border p-3">
            <span class="text-xs font-medium text-muted-foreground uppercase">
              Personal details (optional)
            </span>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="sex">Sex</Label>
                <Select.Root
                  type="single"
                  value={ctx.formSex || "none"}
                  onValueChange={(value) => {
                    ctx.formSex = value === "none" ? "" : value;
                  }}
                >
                  <Select.Trigger id="sex" class="w-full">
                    {ctx.formSex
                      ? SEX_LABELS[ctx.formSex as keyof typeof SEX_LABELS]
                      : "Not set"}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="none" label="Not set">
                      Not set
                    </Select.Item>
                    {#each SEX_VALUES as value (value)}
                      <Select.Item {value} label={SEX_LABELS[value]}>
                        {SEX_LABELS[value]}
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>

              <div class="grid gap-2">
                <Label for="civilStatus">Civil status</Label>
                <Select.Root
                  type="single"
                  value={ctx.formCivilStatus || "none"}
                  onValueChange={(value) => {
                    ctx.formCivilStatus = value === "none" ? "" : value;
                  }}
                >
                  <Select.Trigger id="civilStatus" class="w-full">
                    {ctx.formCivilStatus
                      ? CIVIL_STATUS_LABELS[
                          ctx.formCivilStatus as keyof typeof CIVIL_STATUS_LABELS
                        ]
                      : "Not set"}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="none" label="Not set">
                      Not set
                    </Select.Item>
                    {#each CIVIL_STATUS_VALUES as value (value)}
                      <Select.Item {value} label={CIVIL_STATUS_LABELS[value]}>
                        {CIVIL_STATUS_LABELS[value]}
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog.Footer class="mx-0 px-4">
        {#if ctx.mode === "edit"}
          <div class="mr-auto flex items-center space-x-2 max-sm:order-1">
            <Switch id="isEmployed" bind:checked={ctx.formIsEmployed} />
            <Label for="isEmployed">Currently employed</Label>
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
          {ctx.mode === "edit" ? "Save changes" : "Add employee"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
