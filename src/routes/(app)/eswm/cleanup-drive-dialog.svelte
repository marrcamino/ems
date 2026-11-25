<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import DateInput from "@/components/date-input.svelte";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { parseDate, type DateValue } from "@internationalized/date";
  import { toast } from "svelte-sonner";
  import { monthLabel } from "../paper/paper-month";
  import type { CleanupDrive } from "./eswm-types";

  let {
    open = $bindable(false),
    drive = null,
    month,
    currentMonth,
    today,
    onSaved,
  }: {
    open: boolean;
    /** The cleanup drive to edit, or null to add one. */
    drive: CleanupDrive | null;
    /** The month on screen, `2026-11`. */
    month: string;
    currentMonth: string;
    today: string;
    /** After a save, with the month of the saved cleanup drive. */
    onSaved: (month: string) => void;
  } = $props();

  const editing = $derived(drive !== null);

  let heldOn = $state<DateValue | undefined>();
  let activity = $state("");
  let place = $state("");
  let sacks = $state<number | null>(null);
  let kilos = $state<number | null>(null);
  let participants = $state<number | null>(null);
  let submitting = $state(false);

  function seed() {
    // A new one starts on today only in this month; for a past month the
    // day is not known, so the date starts empty.
    heldOn = drive
      ? parseDate(drive.heldOn)
      : month === currentMonth
        ? parseDate(today)
        : undefined;
    activity = drive?.activity ?? "";
    place = drive?.place ?? "";
    sacks = drive?.sacks ?? null;
    kilos = drive?.kilos ?? null;
    participants = drive?.participants ?? null;
  }

  $effect(() => {
    if (open) seed();
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
        const savedMonth = heldOn?.toString().slice(0, 7) ?? month;
        return async ({ result, update }) => {
          if (result.type === "success") {
            toast.success(editing ? "Entry updated" : "Entry added", {
              description:
                savedMonth === month
                  ? undefined
                  : `It is under ${monthLabel(savedMonth)}.`,
            });
            open = false;
          }
          if (result.type === "failure") {
            toastErrorOnce("eswm-drive", "Entry not saved", {
              description:
                (result.data as { error?: string } | undefined)?.error ??
                "Try again.",
            });
          }
          await update({ reset: false, invalidateAll: true });
          submitting = false;
          // After the reload, which would otherwise cancel the move to the
          // saved entry's month.
          if (result.type === "success") onSaved(savedMonth);
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>
          {editing ? "Edit collected waste" : "Add collected waste"}
        </Dialog.Title>
        <Dialog.Description>
          {editing
            ? "Correct the details of this entry."
            : "Record the waste that was collected at one cleanup."}
        </Dialog.Description>
      </Dialog.Header>

      {#if drive}
        <HiddenInput name="drivePk" value={drive.drivePk} />
      {/if}
      <HiddenInput name="heldOn" value={heldOn?.toString() ?? ""} />
      <HiddenInput name="sacks" value={sacks ?? ""} />
      <HiddenInput name="kilos" value={kilos ?? ""} />
      <HiddenInput name="participants" value={participants ?? ""} />

      <div class="grid gap-2">
        <Label for="heldOn" required>Date</Label>
        <DateInput
          id="heldOn"
          bind:value={heldOn}
          maxValue={parseDate(today)}
          required
        />
      </div>

      <div class="grid gap-2">
        <Label for="activity" required>Activity</Label>
        <Input
          id="activity"
          name="activity"
          bind:value={activity}
          maxlength={150}
          placeholder="Coastal cleanup"
          required
        />
      </div>

      <div class="grid gap-2">
        <Label for="place" required>Place</Label>
        <Input
          id="place"
          name="place"
          bind:value={place}
          maxlength={200}
          placeholder="Barangay and town"
          required
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="grid gap-2">
          <Label for="sacks" required>Sacks</Label>
          <InputGroup.Root>
            <NumberInput
              grouped
              id="sacks"
              wholeDigits={5}
              decimals={0}
              placeholder="0"
              bind:value={sacks}
              required
            />
            <InputGroup.Addon align="inline-end">sacks</InputGroup.Addon>
          </InputGroup.Root>
        </div>
        <div class="grid gap-2">
          <Label for="kilos" required>Kilos</Label>
          <InputGroup.Root>
            <NumberInput
              grouped
              id="kilos"
              wholeDigits={6}
              decimals={2}
              padDecimals
              placeholder="0"
              bind:value={kilos}
              required
            />
            <InputGroup.Addon align="inline-end">kg</InputGroup.Addon>
          </InputGroup.Root>
        </div>
      </div>

      <div class="grid gap-2">
        <Label for="participants">Number of participants</Label>
        <InputGroup.Root>
          <NumberInput
            grouped
            id="participants"
            wholeDigits={5}
            decimals={0}
            placeholder="0"
            bind:value={participants}
          />
          <InputGroup.Addon align="inline-end">people</InputGroup.Addon>
        </InputGroup.Root>
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
          {editing ? "Save changes" : "Add collected waste"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
