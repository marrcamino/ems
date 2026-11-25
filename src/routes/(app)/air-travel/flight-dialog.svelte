<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { toastErrorOnce } from "$lib/utils/toast.js";
  import DateInput from "@/components/date-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { parseDate, type DateValue } from "@internationalized/date";
  import { toast } from "svelte-sonner";
  import SearchPicker, { type PickerItem } from "../fuel/search-picker.svelte";
  import { monthLabel } from "../paper/paper-month";
  import { formatCount } from "./air-travel-format";
  import type { Flight, RouteOption, StaffOption } from "./air-travel-types";

  let {
    open = $bindable(false),
    flight = null,
    staff,
    routes,
    month,
    currentMonth,
    today,
    onSaved,
  }: {
    open: boolean;
    /** The flight to edit, or null to add one. */
    flight: Flight | null;
    staff: StaffOption[];
    /** The routes on the Routes page that a flight can take. */
    routes: RouteOption[];
    /** The month on screen, `2026-11`. */
    month: string;
    currentMonth: string;
    today: string;
    /** After a save, with the month of the saved flight. */
    onSaved: (month: string) => void;
  } = $props();

  const editing = $derived(flight !== null);

  // Someone who has left since is not in the staff list, but stays on the
  // flight being edited.
  const people: PickerItem[] = $derived([
    ...staff.map((s) => ({
      value: String(s.employeePk),
      label: s.name,
      detail: s.position,
    })),
    ...(flight &&
    !staff.some((s) => s.employeePk === flight.traveller.employeePk)
      ? [
          {
            value: String(flight.traveller.employeePk),
            label: flight.traveller.name,
          },
        ]
      : []),
  ]);

  // Every place on a route, spelled as the Routes page has it.
  const places: PickerItem[] = $derived(
    [...new Set(routes.flatMap((r) => [r.placeA, r.placeB]))]
      .sort((a, b) => a.localeCompare(b))
      .map((place) => ({ value: place, label: place })),
  );

  let flownOn = $state<DateValue | undefined>();
  let traveller = $state("");
  let travelOrderNo = $state("");
  let fromPlace = $state("");
  let toPlace = $state("");
  let roundTrip = $state(false);
  let destination = $state("");
  let note = $state("");
  let submitting = $state(false);

  // The route between the two places, in either direction.
  const route = $derived(
    fromPlace && toPlace && fromPlace !== toPlace
      ? routes.find(
          (r) =>
            (r.placeA === fromPlace && r.placeB === toPlace) ||
            (r.placeA === toPlace && r.placeB === fromPlace),
        )
      : undefined,
  );
  const noRoute = $derived(
    !!fromPlace && !!toPlace && fromPlace !== toPlace && !route,
  );

  function seed() {
    // A new one starts on today only in this month; for a past month the
    // day is not known, so the date starts empty.
    flownOn = flight
      ? parseDate(flight.flownOn)
      : month === currentMonth
        ? parseDate(today)
        : undefined;
    traveller = flight ? String(flight.traveller.employeePk) : "";
    travelOrderNo = flight?.travelOrderNo ?? "";
    fromPlace = flight?.fromPlace ?? "";
    toPlace = flight?.toPlace ?? "";
    roundTrip = flight?.roundTrip ?? false;
    destination = flight?.destination ?? "";
    note = flight?.note ?? "";
  }

  $effect(() => {
    if (open) seed();
  });
</script>

<Dialog.Root bind:open>
  <!--
    The fields scroll inside the dialog when the window is short, so the
    title and the buttons stay in view.
  -->
  <Dialog.Content
    class="flex max-h-[min(593px,calc(100dvh-2rem))] flex-col sm:max-w-120"
  >
    <form
      class="flex min-h-0 flex-col gap-4"
      method="POST"
      action={editing ? "?/edit" : "?/add"}
      autocomplete="off"
      use:enhance={() => {
        submitting = true;
        const savedMonth = flownOn?.toString().slice(0, 7) ?? month;
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
            toastErrorOnce("air-travel-flight", "Entry not saved", {
              description:
                (result.data as { error?: string } | undefined)?.error ??
                "Try again.",
            });
          }
          await update({ reset: false, invalidateAll: true });
          submitting = false;
          // After the reload, which would otherwise cancel the move to the
          // saved flight's month.
          if (result.type === "success") onSaved(savedMonth);
        };
      }}
    >
      <Dialog.Header>
        <Dialog.Title>{editing ? "Edit flight" : "Add flight"}</Dialog.Title>
        <Dialog.Description>
          {editing
            ? "Correct the details of this flight."
            : "Record one person's flight, from one place to the next."}
        </Dialog.Description>
      </Dialog.Header>

      {#if flight}
        <HiddenInput name="flightPk" value={flight.flightPk} />
      {/if}
      <HiddenInput name="flownOn" value={flownOn?.toString() ?? ""} />

      <ScrollArea
        class="-mx-4 flex min-h-0 flex-col"
        viewPortClasses="h-auto px-4 scroll-fade-y"
        type="auto"
      >
        <!-- `py-1` keeps the focus ring of the first and last field in view. -->
        <div class="grid gap-5 py-1">
          <div class="grid gap-2">
            <Label for="flownOn" required>Date</Label>
            <DateInput
              id="flownOn"
              bind:value={flownOn}
              maxValue={parseDate(today)}
              required
            />
          </div>

          <div class="grid gap-2">
            <Label id="traveller-label" for="traveller" required
              >Traveller</Label
            >
            <SearchPicker
              id="traveller"
              items={people}
              bind:value={traveller}
              placeholder="Choose a staff member"
              searchPlaceholder="Search staff"
              empty="Nobody matches."
              aria-labelledby="traveller-label"
              required
            />
          </div>

          <div class="grid gap-2">
            <Label for="travelOrderNo" required>Travel order no.</Label>
            <Input
              id="travelOrderNo"
              name="travelOrderNo"
              bind:value={travelOrderNo}
              maxlength={50}
              placeholder="For example, PDI 2025-02-03012"
              required
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="grid min-w-0 gap-2">
              <Label id="fromPlace-label" for="fromPlace" required>From</Label>
              <SearchPicker
                id="fromPlace"
                items={places}
                bind:value={fromPlace}
                placeholder="Choose a place"
                searchPlaceholder="Search places"
                empty="No place matches."
                aria-labelledby="fromPlace-label"
                required
              />
            </div>
            <div class="grid min-w-0 gap-2">
              <Label id="toPlace-label" for="toPlace" required>To</Label>
              <SearchPicker
                id="toPlace"
                items={places}
                bind:value={toPlace}
                placeholder="Choose a place"
                searchPlaceholder="Search places"
                empty="No place matches."
                aria-labelledby="toPlace-label"
                required
              />
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="distance">Distance, one way</Label>
            <InputGroup.Root>
              <InputGroup.Input
                id="distance"
                readonly
                tabindex={-1}
                value={route ? formatCount(route.distanceKm) : "—"}
                class="bg-muted/50"
              />
              <InputGroup.Addon align="inline-end">km</InputGroup.Addon>
            </InputGroup.Root>
            {#if noRoute}
              <!-- The server refuses the flight with the same reason. -->
              <p class="text-sm text-destructive">
                No route between {fromPlace} and {toPlace} yet.
                <a href="/air-travel/routes" class="underline"
                  >Add it on the Routes page</a
                >.
              </p>
            {/if}
          </div>

          <div class="flex items-center gap-3">
            <Checkbox
              id="roundTrip"
              name="roundTrip"
              bind:checked={roundTrip}
            />
            <Label for="roundTrip">Round trip</Label>
          </div>

          <div class="grid gap-2">
            <Label for="destination">Destination</Label>
            <Input
              id="destination"
              name="destination"
              bind:value={destination}
              maxlength={150}
              placeholder="For example, DENR Central Office"
            />
          </div>

          <div class="grid gap-2">
            <Label for="note">Note</Label>
            <Input
              id="note"
              name="note"
              bind:value={note}
              maxlength={200}
              placeholder="For example, the purpose of the trip"
            />
          </div>
        </div>
      </ScrollArea>

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
          {editing ? "Save changes" : "Add flight"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
