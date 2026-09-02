<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { TriangleAlert } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { getEmployeesContext, type EmployeeRow } from "./context.svelte.js";

  const ctx = getEmployeesContext();

  let submitting = $state(false);

  const canSave = $derived(
    !submitting &&
      !!ctx.entryFirstName.trim() &&
      !!ctx.entryLastName.trim() &&
      !!ctx.entryPositionTitle.trim() &&
      ctx.entryIsDifferent,
  );
</script>

<Dialog.Root
  bind:open={ctx.correctEntryDialog}
  onOpenChangeComplete={() => {
    // Clearing the fields when the dialog closes is what stops a half-typed
    // correction to one entry appearing in the next entry that is opened.
    ctx.startEditingEntry(null);
  }}
>
  <Dialog.Content class="px-0 sm:max-w-125">
    {#if ctx.editingEntry}
      {@const entry = ctx.editingEntry}
      <form
        class="grid gap-4"
        method="POST"
        action="?/correctEntry"
        autocomplete="off"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              const data = result.data as
                | { updatedRow?: EmployeeRow }
                | undefined;

              // Put the repaired wording back into the list rather than
              // fetching the whole history again for one row.
              ctx.replaceHistoryEntry({
                ...entry,
                firstName: ctx.entryFirstName.trim(),
                middleName: ctx.entryMiddleName.trim() || null,
                lastName: ctx.entryLastName.trim(),
                suffix: ctx.entrySuffix.trim() || null,
                positionTitle: ctx.entryPositionTitle.trim(),
                positionShortForm: ctx.entryPositionShortForm.trim() || null,
              });

              // Only sent back when the entry repaired was the current one,
              // which is the only case where the person's details on the
              // table behind change too.
              if (data?.updatedRow) ctx.updateEmployee(data.updatedRow);

              toast.success("The entry was corrected");
              ctx.correctEntryDialog = false;
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
          <Dialog.Title>Correct this entry</Dialog.Title>
          <Dialog.Description>
            Only for wording that was typed wrong. The dates this entry covers
            do not move.
          </Dialog.Description>
        </Dialog.Header>

        <ScrollArea viewPortClasses="px-4 size-full max-h-[calc(100vh-20rem)]">
          <input
            type="hidden"
            name="employeeHistoryPk"
            value={entry.employeeHistoryPk}
          />

          <Alert.Root variant="warning" class="mb-4">
            <TriangleAlert />
            <Alert.Title>This corrects what is already filed</Alert.Title>
            <Alert.Description>
              {#if entry.documentCount === 0}
                No document uses this entry yet, so nothing else changes.
              {:else if entry.documentCount === 1}
                1 document uses this entry and will show the corrected wording
                straight away.
              {:else}
                {entry.documentCount} documents use this entry and will all show
                the corrected wording straight away.
              {/if}
              {#if entry.validUntil === null}
                <br /><br />
                This is the entry in use now, so the person's details on the Employees
                page change with it.
              {/if}
            </Alert.Description>
          </Alert.Root>

          <div class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="entryFirstName">First name</Label>
                <Input
                  id="entryFirstName"
                  name="firstName"
                  bind:value={ctx.entryFirstName}
                  maxlength={100}
                  required
                />
              </div>

              <div class="grid gap-2">
                <Label for="entryMiddleName">Middle name</Label>
                <Input
                  id="entryMiddleName"
                  name="middleName"
                  bind:value={ctx.entryMiddleName}
                  maxlength={100}
                />
              </div>

              <div class="grid gap-2">
                <Label for="entryLastName">Last name</Label>
                <Input
                  id="entryLastName"
                  name="lastName"
                  bind:value={ctx.entryLastName}
                  maxlength={100}
                  required
                />
              </div>

              <div class="grid gap-2">
                <Label for="entrySuffix">Suffix</Label>
                <Input
                  id="entrySuffix"
                  name="suffix"
                  bind:value={ctx.entrySuffix}
                  maxlength={20}
                  placeholder="Jr., III"
                />
              </div>
            </div>

            <div class="grid gap-2">
              <Label for="entryPositionTitle">Position</Label>
              <Input
                id="entryPositionTitle"
                name="positionTitle"
                bind:value={ctx.entryPositionTitle}
                maxlength={100}
                required
              />
            </div>

            <div class="grid gap-2">
              <Label for="entryPositionShortForm">
                Short form printed on forms
              </Label>
              <Input
                id="entryPositionShortForm"
                name="positionShortForm"
                bind:value={ctx.entryPositionShortForm}
                maxlength={50}
                placeholder="AO-I/Supply Officer"
              />
            </div>
          </div>
        </ScrollArea>

        <Dialog.Footer class="mx-0 px-4">
          <Dialog.Close
            disabled={submitting}
            type="button"
            class={buttonVariants({ variant: "outline" })}
          >
            Cancel
          </Dialog.Close>

          <Button type="submit" disabled={!canSave}>
            {#if submitting}
              <Spinner />
            {/if}
            Save the correction
          </Button>
        </Dialog.Footer>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
