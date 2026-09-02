<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { Info } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { fullName, getEmployeesContext, type EmployeeRow } from "./context.svelte.js";

  const ctx = getEmployeesContext();

  let submitting = $state(false);

  const canSubmit = $derived(
    !submitting &&
      !!ctx.changeFirstName.trim() &&
      !!ctx.changeLastName.trim() &&
      !!ctx.changePositionTitle.trim() &&
      // Saving an unchanged form would close the current entry and open an
      // identical one, leaving a break in the dates for no reason.
      ctx.changeIsDifferent,
  );
</script>

<Dialog.Root
  bind:open={ctx.addChangeDialog}
  onOpenChangeComplete={() => {
    ctx.resetChangeInputValues();
  }}
>
  <Dialog.Content class="px-0 sm:max-w-125">
    <form
      class="grid gap-4"
      method="POST"
      action="?/addChange"
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            const data = result.data as
              | { updatedRow?: EmployeeRow }
              | undefined;

            if (data?.updatedRow) ctx.updateEmployee(data.updatedRow);

            toast.success("The change was recorded", {
              description:
                "Documents already filed keep the name and position they were filed with.",
            });
            ctx.addChangeDialog = false;
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
        <Dialog.Title>Add name or position change</Dialog.Title>
        <Dialog.Description>
          Use this when something really changed, such as a marriage or a
          promotion. Nothing already filed is altered.
        </Dialog.Description>
      </Dialog.Header>

      <ScrollArea viewPortClasses="px-4 size-full max-h-[calc(100vh-20rem)]">
        {#if ctx.employeeToChange}
          <input
            type="hidden"
            name="employeePk"
            value={ctx.employeeToChange.employeePk}
          />

          <Alert.Root class="mb-4">
            <Info />
            <Alert.Title>
              What this does to {fullName(ctx.employeeToChange)}
            </Alert.Title>
            <Alert.Description>
              The name and position below start being used from today. Every
              document filed before today keeps showing what this person is
              called now.
              <br /><br />
              If instead something here was simply typed wrong, close this and use
              Edit instead, so the mistake is corrected everywhere.
            </Alert.Description>
          </Alert.Root>

          <div class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="changeFirstName">First name</Label>
                <Input
                  id="changeFirstName"
                  name="firstName"
                  bind:value={ctx.changeFirstName}
                  maxlength={100}
                  required
                />
              </div>

              <div class="grid gap-2">
                <Label for="changeMiddleName">Middle name</Label>
                <Input
                  id="changeMiddleName"
                  name="middleName"
                  bind:value={ctx.changeMiddleName}
                  maxlength={100}
                />
              </div>

              <div class="grid gap-2">
                <Label for="changeLastName">Last name</Label>
                <Input
                  id="changeLastName"
                  name="lastName"
                  bind:value={ctx.changeLastName}
                  maxlength={100}
                  required
                />
              </div>

              <div class="grid gap-2">
                <Label for="changeSuffix">Suffix</Label>
                <Input
                  id="changeSuffix"
                  name="suffix"
                  bind:value={ctx.changeSuffix}
                  maxlength={20}
                  placeholder="Jr., III"
                />
              </div>
            </div>

            <div class="grid gap-2">
              <Label for="changePositionTitle">Position</Label>
              <Input
                id="changePositionTitle"
                name="positionTitle"
                bind:value={ctx.changePositionTitle}
                maxlength={100}
                required
              />
            </div>

            <div class="grid gap-2">
              <Label for="changePositionShortForm">
                Short form printed on forms
              </Label>
              <Input
                id="changePositionShortForm"
                name="positionShortForm"
                bind:value={ctx.changePositionShortForm}
                maxlength={50}
                placeholder="AO-I/Supply Officer"
              />
              <p class="text-xs text-muted-foreground">
                The boxes on the printed forms are too small for a full
                position.
              </p>
            </div>
          </div>
        {/if}
      </ScrollArea>

      <Dialog.Footer class="mx-0 px-4">
        <Dialog.Close
          disabled={submitting}
          type="button"
          class={buttonVariants({ variant: "outline" })}
        >
          Cancel
        </Dialog.Close>

        <Button type="submit" disabled={!canSubmit}>
          {#if submitting}
            <Spinner />
          {/if}
          Record the change
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
