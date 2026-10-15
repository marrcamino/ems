<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import {
    CalendarDate,
    getLocalTimeZone,
    today,
    type DateValue,
  } from "@internationalized/date";

  const tz = getLocalTimeZone();
  const todayDate = today(tz);

  // 1. A purchase order is dated today unless the admin types an earlier day.
  let poDate = $state<DateValue | undefined>(todayDate);
  const poDateLate = $derived(!!poDate && poDate.compare(todayDate) > 0);

  // 2. A withdrawal slip form: the browser itself refuses to save while a
  // required field is empty, and Reset empties the date like the litres.
  let slipDate = $state<DateValue | undefined>();
  let slipField = $state<DateInput>();
  let slipSent = $state("");

  function saveSlip(e: SubmitEvent) {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    slipSent = [...form].map(([k, v]) => `${k}=${v}`).join(", ");
  }

  // 3. A delivery period: the end cannot come before the start.
  let fromDate = $state<DateValue | undefined>();
  let toDate = $state<DateValue | undefined>();
  const periodBackwards = $derived(
    !!fromDate && !!toDate && toDate.compare(fromDate) < 0,
  );

  // 4. A date years back, where typing the year beats paging the calendar.
  let hiredDate = $state<DateValue | undefined>();
  const hiredLate = $derived(!!hiredDate && hiredDate.compare(todayDate) > 0);

  // 5. A date that the page shows but does not let the admin change.
  let lockedDate = $state<DateValue | undefined>(new CalendarDate(2026, 9, 1));
</script>

<svelte:head>
  <title>Test - EMS</title>
</svelte:head>

<header
  class="flex h-16 shrink-0 items-center gap-2 sticky top-0 bg-background rounded-t-xl z-20"
>
  <div class="flex items-center gap-2 px-4 w-full">
    <Sidebar.Trigger class="-ms-1" />
    <Separator
      orientation="vertical"
      class="me-2 data-[orientation=vertical]:h-4"
    />
    <Breadcrumb.Root>
      <Breadcrumb.List>
        <Breadcrumb.Item class="hidden md:block">
          <Breadcrumb.Link href="/admin">Dashboard</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator class="hidden md:block" />
        <Breadcrumb.Item>
          <Breadcrumb.Page>Test</Breadcrumb.Page>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  </div>
</header>

{#snippet stored(value: DateValue | undefined)}
  <p class="text-xs text-muted-foreground tabular-nums">
    Stored value: {value ? value.toString() : "empty"}
  </p>
{/snippet}

<div class="grid gap-4 p-4 pt-0 lg:grid-cols-2">
  <Card.Root>
    <Card.Header>
      <Card.Title>Purchase order date</Card.Title>
      <Card.Description>
        Starts at today. Type an earlier day, or type a later one to see the
        field turn red.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-2">
      <Field.Field data-invalid={poDateLate || undefined} class="max-w-56">
        <Field.Label id="po-date-label">PO date</Field.Label>
        <DateInput
          id="po-date"
          aria-labelledby="po-date-label"
          bind:value={poDate}
          maxValue={todayDate}
        />
        {#if poDateLate}
          <Field.Error>Enter a date on or before today.</Field.Error>
        {/if}
      </Field.Field>
      {@render stored(poDate)}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Withdrawal slip form</Card.Title>
      <Card.Description>
        A real form. Press Save with the date empty to see the browser's own
        message, then type a digit straight away. Reset empties the date like
        the litres; Clear date empties only the date, even when half-typed.
      </Card.Description>
    </Card.Header>
    <form class="contents" onsubmit={saveSlip}>
      <Card.Content class="flex flex-col gap-2">
        <Field.Group class="flex-row gap-4">
          <Field.Field class="max-w-56">
            <Field.Label id="slip-date-label">Date of withdrawal</Field.Label>
            <DateInput
              bind:this={slipField}
              id="slip-date"
              name="slip_date"
              aria-labelledby="slip-date-label"
              bind:value={slipDate}
              maxValue={todayDate}
              required
            />
          </Field.Field>
          <Field.Field class="max-w-32">
            <Field.Label for="slip-litres">Litres</Field.Label>
            <Input id="slip-litres" name="litres" inputmode="decimal" required />
          </Field.Field>
        </Field.Group>
        {@render stored(slipDate)}
        <p class="text-xs text-muted-foreground tabular-nums">
          Last sent: {slipSent || "nothing yet"}
        </p>
      </Card.Content>
      <Card.Footer class="gap-2">
        <Button type="submit">Save</Button>
        <Button type="reset" variant="outline">Reset</Button>
        <Button type="button" variant="ghost" onclick={() => slipField?.clear()}>
          Clear date
        </Button>
      </Card.Footer>
    </form>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Delivery period</Card.Title>
      <Card.Description>
        Two dates side by side. The To calendar greys out the days that come
        before From; typing one of those days turns the field red.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-2">
      <Field.Group class="flex-row gap-4">
        <Field.Field class="max-w-56">
          <Field.Label id="from-date-label">From</Field.Label>
          <DateInput
            id="from-date"
            aria-labelledby="from-date-label"
            bind:value={fromDate}
          />
        </Field.Field>
        <Field.Field data-invalid={periodBackwards || undefined} class="max-w-56">
          <Field.Label id="to-date-label">To</Field.Label>
          <DateInput
            id="to-date"
            aria-labelledby="to-date-label"
            bind:value={toDate}
            minValue={fromDate}
          />
          {#if periodBackwards}
            <Field.Error>Enter an end date on or after the start date.</Field.Error>
          {/if}
        </Field.Field>
      </Field.Group>
      <p class="text-xs text-muted-foreground tabular-nums">
        Stored value: {fromDate ? fromDate.toString() : "empty"} to
        {toDate ? toDate.toString() : "empty"}
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Date hired</Card.Title>
      <Card.Description>
        A date years back. Typing 03 15 2009 is quicker than paging the
        calendar; the calendar also has month and year menus.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-2">
      <Field.Field data-invalid={hiredLate || undefined} class="max-w-56">
        <Field.Label id="hired-date-label">Date hired</Field.Label>
        <DateInput
          id="hired-date"
          aria-labelledby="hired-date-label"
          bind:value={hiredDate}
          minValue={new CalendarDate(1970, 1, 1)}
          maxValue={todayDate}
          captionLayout="dropdown"
        />
        {#if hiredLate}
          <Field.Error>Enter a date on or before today.</Field.Error>
        {/if}
      </Field.Field>
      {@render stored(hiredDate)}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Locked date</Card.Title>
      <Card.Description>
        How the field looks when the page shows a date that cannot be changed.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-2">
      <Field.Field data-disabled class="max-w-56">
        <Field.Label id="locked-date-label">Date approved</Field.Label>
        <DateInput
          id="locked-date"
          aria-labelledby="locked-date-label"
          bind:value={lockedDate}
          disabled
        />
      </Field.Field>
      {@render stored(lockedDate)}
    </Card.Content>
  </Card.Root>
</div>
