<script lang="ts">
  import { enhance } from "$app/forms";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { TabsContent } from "$lib/components/ui/tabs/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { capitalize, dataAttr, fullName } from "@/utils";
  import { TriangleAlert } from "@lucide/svelte/icons";
  import { untrack } from "svelte";
  import { toast } from "svelte-sonner";
  import type { PageData } from "../$types";

  let { data }: { data: PageData } = $props();

  const gblCtx = getGlobalContext();
  let mayManage = $derived(gblCtx.can("admin:manage_signatories"));

  // Each setting is saved on its own, so each tracks its own in-flight state.
  let savingUnit = $state(false);
  let savingApprover = $state(false);

  // What is on file, and what each picker is showing. They are kept apart so a
  // Save button can tell whether anything was actually changed.
  let savedUnit = $derived(data.gsuUnitPk);
  let savedApprover = $derived(data.usualApproverPk);

  let unitPk = $state("");
  let approverPk = $state("");

  // Re-seed both pickers whenever the page's data is refreshed, which happens
  // after a save and after navigating back to this page.
  $effect(() => {
    const next = savedUnit;
    untrack(() => (unitPk = next));
  });

  $effect(() => {
    // "none" is the picker's way of saying nobody; on file that is an empty
    // value, so the two are translated into each other here and on submit.
    const next = savedApprover || "none";
    untrack(() => (approverPk = next));
  });

  let chosenUnit = $derived(
    data.orgUnits.find(({ orgUnitPk }) => String(orgUnitPk) === unitPk),
  );
  let chosenApprover = $derived(
    data.employees.find(({ employeePk }) => String(employeePk) === approverPk),
  );

  let approverValue = $derived(approverPk === "none" ? "" : approverPk);

  let unitChanged = $derived(unitPk !== savedUnit);
  let approverChanged = $derived(approverValue !== savedApprover);

  function onResult(
    result: { type: string; data?: unknown },
    revert: () => void,
  ) {
    if (result.type === "success") toast.success("Saved");

    if (result.type === "failure") {
      const message =
        (result.data as { error?: string } | undefined)?.error ??
        "Something went wrong.";
      toast.error(message);
      revert();
    }
  }
</script>

<TabsContent value="fuel">
  <div class="grid max-w-2xl gap-8 py-6">
    <!-- Which unit is the General Services Unit -->
    <form
      class="grid gap-3 border-b pb-8"
      method="POST"
      action="?/setGsuUnit"
      autocomplete="off"
      use:enhance={() => {
        savingUnit = true;
        return async ({ result, update }) => {
          onResult(result, () => (unitPk = savedUnit));
          await update({ reset: false });
          savingUnit = false;
        };
      }}
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Label for="gsu-unit" class="font-medium gap-1.5">
          General Services Unit
          <!-- The colour is the state, not decoration: it calls for
                 attention only while the unit is still missing. -->
          {#if savedUnit}
            <Badge variant="secondary">Required</Badge>
          {:else}
            <Badge variant="destructive">
              <TriangleAlert />
              Required
            </Badge>
          {/if}
        </Label>

        <Select.Root type="single" bind:value={unitPk} disabled={!mayManage}>
          <Select.Trigger
            id="gsu-unit"
            class="w-full sm:w-72"
            disabled={!mayManage}
          >
            {chosenUnit?.orgUnitName ?? "Not set yet"}
            <HiddenInput name="orgUnitPk" value={unitPk} />
          </Select.Trigger>
          <Select.Content>
            {#each data.orgUnits as { orgUnitPk, orgUnitName, level }}
              <Select.Item value={String(orgUnitPk)}>
                {orgUnitName}
                <span class="text-muted-foreground text-xs">
                  {capitalize(level)}
                </span>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="text-muted-foreground text-sm">
        <p>Only this unit's staff are offered on:</p>
        <ul class="mt-1 grid gap-0.5 ps-4">
          <li class="list-disc">
            Withdrawal Slip — "Approved by", which prints "GSU Representative"
          </li>
          <li class="list-disc">Requisition and Issue Slip — "Issued by"</li>
        </ul>
        {#if !savedUnit}
          <p class="mt-2">
            No unit is set, so those two lines have nobody to offer.
          </p>
        {/if}
      </div>

      {#if mayManage}
        <div class="flex justify-end">
          <Button type="submit" disabled={!unitChanged || savingUnit}>
            {#if savingUnit}
              <Spinner />
            {/if}
            Save
          </Button>
        </div>
      {/if}
    </form>

    <!-- Who is filled in as the approver -->
    <form
      class="grid gap-3"
      method="POST"
      action="?/setUsualApprover"
      autocomplete="off"
      use:enhance={() => {
        savingApprover = true;
        return async ({ result, update }) => {
          onResult(result, () => (approverPk = savedApprover || "none"));
          await update({ reset: false });
          savingApprover = false;
        };
      }}
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <Label for="usual-approver" class="font-medium gap-1.5">
          Usual approver

          <Badge variant="secondary">Optional</Badge>
        </Label>

        <Select.Root
          type="single"
          bind:value={approverPk}
          disabled={!mayManage}
        >
          <Select.Trigger
            id="usual-approver"
            class="w-full sm:w-72"
            disabled={!mayManage}
            data-no-value={dataAttr(approverValue === "")}
          >
            {chosenApprover ? fullName(chosenApprover) : "Nobody"}
            <HiddenInput name="employeePk" value={approverValue} />
          </Select.Trigger>
          <Select.Content class="w-min">
            <Select.Item value="none">Nobody</Select.Item>
            {#each data.employees as person}
              <Select.Item value={String(person.employeePk)}>
                <p class="grid">
                  <span class="truncate">
                    {fullName(person)}
                  </span>
                  <span class="text-muted-foreground text-xs truncate">
                    {person.positionTitle}
                  </span>
                </p>
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="text-muted-foreground text-sm">
        <p>Filled in already, and can still be changed, on:</p>
        <ul class="mt-1 grid gap-0.5 ps-4">
          <li class="list-disc">Driver Trip Ticket — "Approved by"</li>
          <li class="list-disc">Requisition and Issue Slip — "Approved by"</li>
        </ul>
        <p class="mt-2">
          Leaving this as Nobody is fine. Both lines then start blank and
          whoever prepares the document picks who signs.
        </p>
      </div>

      {#if mayManage}
        <div class="flex justify-end">
          <Button type="submit" disabled={!approverChanged || savingApprover}>
            {#if savingApprover}
              <Spinner />
            {/if}
            Save
          </Button>
        </div>
      {/if}
    </form>
  </div>
</TabsContent>
