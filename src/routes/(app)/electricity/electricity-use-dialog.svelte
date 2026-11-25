<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import { monthLabel } from "../paper/paper-month";
  import type { BuildingOption, ElectricityUse } from "./electricity-types";

  let {
    open = $bindable(false),
    use = null,
    month,
    buildings,
    entered,
  }: {
    open: boolean;
    /** The entry to edit, or null to add one. */
    use: ElectricityUse | null;
    /** The month on screen, `2026-10`, which a new entry belongs to. */
    month: string;
    /** The active buildings, and any inactive one with an entry this month. */
    buildings: BuildingOption[];
    /** The buildings that already have an entry this month. */
    entered: number[];
  } = $props();

  const editing = $derived(use !== null);

  /** The buildings the picker offers: an inactive one only for its own entry. */
  const choices = $derived(
    buildings.filter(
      (b) => b.status === "active" || b.buildingPk === use?.buildingPk,
    ),
  );
  /** A building has one entry a month; its own entry may keep it. */
  const taken = (pk: number) =>
    entered.includes(pk) && pk !== use?.buildingPk;
  const noneFree = $derived(
    !editing && choices.every((b) => taken(b.buildingPk)),
  );

  let buildingPk = $state("");
  const buildingName = $derived(
    choices.find((b) => String(b.buildingPk) === buildingPk)?.name,
  );

  let kwh = $state<number | null>(null);
  let note = $state("");
  let submitting = $state(false);

  $effect(() => {
    if (open) {
      buildingPk = use ? String(use.buildingPk) : "";
      kwh = use?.kwh ?? null;
      note = use?.note ?? "";
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-110">
    <form
      class="grid gap-5"
      method="POST"
      action={editing ? "?/edit" : "?/add"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success(editing ? "Entry updated" : "Entry added");
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("electricity-use", "Entry not saved", {
              description:
                (result.data as { error?: string } | undefined)?.error ??
                "Try again.",
            });
          }
          await update({ reset: false, invalidateAll: true });
          submitting = false;
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {editing ? "Edit electricity use" : "Add electricity use"}
        </Dialog.Title>
        <Dialog.Description>
          {editing
            ? `Correct this entry for ${monthLabel(month)}.`
            : `Record the electricity that one building used in ${monthLabel(month)}.`}
        </Dialog.Description>
      </Dialog.Header>

      {#if use}
        <HiddenInput name="usePk" value={use.usePk} />
      {/if}
      <HiddenInput name="month" value={month} />
      <HiddenInput name="kwh" value={kwh ?? ""} />
      <HiddenInput name="buildingPk" value={buildingPk} />

      <div class="grid gap-2">
        <Label for="building" required>Building</Label>
        <Select.Root type="single" bind:value={buildingPk}>
          <Select.Trigger id="building" class="w-full">
            {buildingName ?? "Choose a building"}
          </Select.Trigger>
          <Select.Content>
            {#each choices as b (b.buildingPk)}
              <Select.Item
                value={String(b.buildingPk)}
                label={b.name}
                disabled={taken(b.buildingPk)}
              >
                {b.name}
                {#if taken(b.buildingPk)}
                  <span class="ml-auto text-xs text-muted-foreground">
                    Already entered
                  </span>
                {/if}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if choices.length === 0}
          <p class="text-sm text-muted-foreground">
            Add the office's buildings first, on the
            <a href="/electricity/buildings" class="underline">Buildings page</a>.
          </p>
        {:else if noneFree}
          <p class="text-sm text-muted-foreground">
            Every building has an entry for {monthLabel(month)}. To change a
            figure, edit its entry.
          </p>
        {/if}
      </div>

      <div class="grid gap-2">
        <Label for="kwh" required>Kilowatt-hours</Label>
        <InputGroup.Root>
          <NumberInput
            grouped
            id="kwh"
            wholeDigits={7}
            decimals={0}
            placeholder="0"
            bind:value={kwh}
            required
          />
          <InputGroup.Addon align="inline-end">kWh</InputGroup.Addon>
        </InputGroup.Root>
      </div>

      <div class="grid gap-2">
        <Label for="note">Note</Label>
        <Input
          id="note"
          name="note"
          bind:value={note}
          maxlength={200}
          placeholder="For example, more check-ins at the hostel"
        />
      </div>

      <Dialog.Footer>
        <Button
          type="button"
          variant="outline"
          onclick={() => (open = false)}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !buildingPk}>
          {#if submitting}
            <Spinner />
          {/if}
          {editing ? "Save changes" : "Add electricity use"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
