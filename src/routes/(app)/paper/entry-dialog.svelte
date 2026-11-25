<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { PAPER_SIZES, type PaperSize } from "$lib/paper-sizes";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import DateInput from "@/components/date-input.svelte";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { parseDate, type DateValue } from "@internationalized/date";
  import { toast } from "svelte-sonner";
  import SearchPicker, { type PickerItem } from "../fuel/search-picker.svelte";
  import { firstDay, lastDay, monthLabel } from "./paper-month";
  import type { PaperEntry } from "./paper-types";

  /**
   * Adds or edits one line of the office's paper form: the date, the reams
   * of each size, and who received the paper.
   */
  let {
    open = $bindable(false),
    entry = null,
    month,
    today,
    staff,
    ownEmployeePk,
    onSaved,
  }: {
    open: boolean;
    /** The entry to edit, or null to add one. */
    entry: PaperEntry | null;
    /** The month on screen, `2026-11`. */
    month: string;
    today: string;
    /** The office's own staff, who can be picked as "Received by". */
    staff: { employeePk: number; name: string; positionTitle: string }[];
    /** The person typing, the usual one to receive the paper. */
    ownEmployeePk: number | null;
    /** After a save, with the month of the saved entry. */
    onSaved: (month: string) => void;
  } = $props();

  const editing = $derived(entry !== null);

  type Reams = Record<PaperSize, number | null>;
  const blank = () =>
    Object.fromEntries(PAPER_SIZES.map((s) => [s.value, null])) as Reams;

  let consumedOn = $state<DateValue | undefined>();
  let reams = $state<Reams>(blank());
  let receivedByPk = $state("");
  let receivedByTyped = $state("");
  let submitting = $state(false);

  // An edited entry stays in its month (the server refuses another), so
  // its calendar shows only that month. A new one may go in any month up to
  // today.
  const minDate = $derived(editing ? parseDate(firstDay(month)) : undefined);
  const maxDate = $derived(
    parseDate(editing && lastDay(month) < today ? lastDay(month) : today),
  );

  /** An edited line keeps its person, even one who has left the office. */
  const people = $derived.by((): PickerItem[] => {
    const items: PickerItem[] = staff.map((s) => ({
      value: String(s.employeePk),
      label: s.name,
      detail: s.positionTitle,
    }));
    if (
      entry?.receivedByPk &&
      !items.some((i) => i.value === entry.receivedByPk)
    ) {
      items.push({ value: entry.receivedByPk, label: entry.receivedBy });
    }
    return items;
  });

  /**
   * Today when the month on screen is this month, otherwise the month's last
   * day, so a late entry for last month starts inside last month.
   */
  function defaultDate() {
    return parseDate(lastDay(month) < today ? lastDay(month) : today);
  }

  function seed() {
    consumedOn = entry ? parseDate(entry.consumedOn) : defaultDate();
    reams = { ...blank(), ...entry?.reams };
    if (entry) {
      receivedByPk = entry.receivedByPk;
      receivedByTyped = entry.receivedByPk ? "" : entry.receivedBy;
    } else {
      const own = staff.some((s) => s.employeePk === ownEmployeePk);
      receivedByPk = own ? String(ownEmployeePk) : "";
      receivedByTyped = "";
    }
  }

  $effect(() => {
    if (open) seed();
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-105">
    <form
      class="grid gap-5"
      method="POST"
      action={editing ? "?/edit" : "?/add"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        const savedMonth = consumedOn?.toString().slice(0, 7) ?? month;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success(editing ? "Entry updated" : "Entry added", {
              description:
                savedMonth === month
                  ? undefined
                  : `It is under ${monthLabel(savedMonth)}.`,
            });
            open = false;
            onSaved(savedMonth);
          }
          if (result.type === "failure") {
            toastErrorOnce("paper-entry", "Entry not saved", {
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
        <Dialog.Title>{editing ? "Edit entry" : "Add opened ream"}</Dialog.Title
        >
        <Dialog.Description>
          {editing
            ? "Correct the date, the reams, or who received them."
            : "Record the paper each time someone takes it from your office's stack."}
        </Dialog.Description>
      </Dialog.Header>

      {#if entry}
        <HiddenInput name="entryPk" value={entry.entryPk} />
      {/if}
      <HiddenInput name="consumedOn" value={consumedOn?.toString() ?? ""} />
      <HiddenInput name="receivedByPk" value={receivedByPk} />
      <HiddenInput name="receivedByName" value={receivedByTyped} />

      <div class="grid gap-2">
        <Label for="consumedOn">Date</Label>
        <DateInput
          id="consumedOn"
          bind:value={consumedOn}
          minValue={minDate}
          maxValue={maxDate}
          required
        />
      </div>

      <fieldset class="grid gap-2">
        <legend class="mb-2 text-sm font-medium">Reams</legend>
        {#each PAPER_SIZES as size (size.value)}
          <HiddenInput
            name="reams-{size.value}"
            value={reams[size.value] ?? ""}
          />
          <div class="grid grid-cols-[4rem_1fr_7rem] items-center gap-x-3">
            <span class="text-sm">{size.label}</span>
            <span class="text-muted-foreground text-xs">{size.measure}</span>
            <InputGroup.Root>
              <NumberInput
                grouped
                wholeDigits={3}
                decimals={0}
                placeholder="0"
                bind:value={reams[size.value]}
                aria-label="{size.label} reams"
              />
              <InputGroup.Addon align="inline-end">reams</InputGroup.Addon>
            </InputGroup.Root>
          </div>
        {/each}
      </fieldset>

      <div class="grid gap-2">
        <Label id="receivedBy-label">Received by</Label>
        <SearchPicker
          id="receivedBy"
          aria-labelledby="receivedBy-label"
          items={people}
          allowTyped
          bind:value={receivedByPk}
          bind:typed={receivedByTyped}
          placeholder="Choose who received it"
          searchPlaceholder="Search or type a name..."
          empty="No one in your office matches."
          required
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
        <Button type="submit" disabled={submitting}>
          {#if submitting}
            <Spinner />
          {/if}
          {editing ? "Save changes" : "Add entry"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
