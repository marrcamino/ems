<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import NumberInput from "$lib/components/number-input.svelte";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { LEGEND, type WithdrawalForm } from "./new-withdrawal-form.svelte.js";
  import PassengersField from "./passengers-field.svelte";
  import SearchPicker from "./search-picker.svelte";
  import TransactionFields from "./transaction-fields.svelte";

  /**
   * The last step of the New withdrawal form, for an asset with a trip
   * ticket. On its own it is the whole Trip only form, which then starts
   * with the office, the file date, and the asset.
   */
  let { form, tripOnly = false }: { form: WithdrawalForm; tripOnly?: boolean } =
    $props();

  const errors = $derived(form.errors);
</script>

<Field.Group class="gap-6">
  {#if tripOnly}
    <Field.Set>
      <Field.Legend class="sr-only">The office and the asset</Field.Legend>
      <TransactionFields
        {form}
        assetItems={form.tripAssetItems}
        noAsset="No active asset with a trip ticket matches."
      />
    </Field.Set>
  {/if}

  <Field.Set>
    <Field.Legend class={LEGEND}>Travel information</Field.Legend>
    <Field.Field data-invalid={errors.driverPk ? true : undefined}>
      <Field.Label id="driverPk-label" required>Driver</Field.Label>
      <SearchPicker
        id="driverPk"
        aria-labelledby="driverPk-label"
        items={form.everyone}
        allowTyped
        bind:value={form.driverPk}
        bind:typed={form.driverName}
        placeholder="Choose or type a name"
        searchPlaceholder="Search or type a name..."
        required
      />
      <Field.Error>{errors.driverPk}</Field.Error>
    </Field.Field>

    <Field.Field>
      <Field.Label id="passengers-label">Passengers</Field.Label>
      <PassengersField
        id="passengers"
        aria-labelledby="passengers-label"
        bind:names={form.passengers}
        bind:open={form.passengersOpen}
      />
    </Field.Field>

    <Field.Field data-invalid={errors.destination ? true : undefined}>
      <Field.Label for="destination" required>Destination</Field.Label>
      <Input
        id="destination"
        bind:value={form.destination}
        maxlength={200}
        required
      />
      <Field.Error>{errors.destination}</Field.Error>
    </Field.Field>

    <Field.Field data-invalid={errors.dttPurpose ? true : undefined}>
      <Field.Label for="dttPurpose" required>Purpose</Field.Label>
      <Textarea
        id="dttPurpose"
        value={form.dttPurpose}
        oninput={(e) => form.typePurpose("dtt", e.currentTarget.value)}
        onblur={() => form.leavePurpose("dtt")}
        maxlength={500}
        rows={2}
        required
      />
      <Field.Error>{errors.dttPurpose}</Field.Error>
    </Field.Field>

    <div class="grid gap-4 sm:grid-cols-2">
      <Field.Field data-invalid={errors.travelFrom ? true : undefined}>
        <Field.Label id="travelFrom-label" required>Travel from</Field.Label>
        <DateInput
          id="travelFrom"
          aria-labelledby="travelFrom-label"
          bind:value={form.travelFrom}
          required
        />
        <Field.Error>{errors.travelFrom}</Field.Error>
      </Field.Field>

      <Field.Field data-invalid={errors.travelTo ? true : undefined}>
        <Field.Label id="travelTo-label" required>Travel to</Field.Label>
        <!-- The browser refuses a return before the start and names the date. -->
        <DateInput
          id="travelTo"
          aria-labelledby="travelTo-label"
          bind:value={form.travelTo}
          minValue={form.travelFrom}
          required
        />
        <Field.Error>{errors.travelTo}</Field.Error>
      </Field.Field>
    </div>

    <Field.Field data-invalid={errors.travelHours ? true : undefined}>
      <Field.Label for="travelHours">No. of hours</Field.Label>
      <InputGroup.Root>
        <NumberInput
          id="travelHours"
          grouped
          bind:value={form.travelHours}
          wholeDigits={4}
        />
        <InputGroup.Addon align="inline-end">hours</InputGroup.Addon>
      </InputGroup.Root>
      <Field.Error>{errors.travelHours}</Field.Error>
    </Field.Field>

    <Field.Field data-invalid={errors.dttRemarks ? true : undefined}>
      <Field.Label for="dttRemarks">Remarks</Field.Label>
      <Textarea id="dttRemarks" bind:value={form.dttRemarks} maxlength={200} />
      <Field.Error>{errors.dttRemarks}</Field.Error>
    </Field.Field>
  </Field.Set>

  <!-- The lines of the trip ticket known before the trip; the rest come with the Complete step. -->
  <Field.Set>
    <Field.Legend class={LEGEND}>Before the trip</Field.Legend>
    <div class="grid gap-4 sm:grid-cols-2">
      <Field.Field data-invalid={errors.departureTime ? true : undefined}>
        <Field.Label for="departureTime">Departure time</Field.Label>
        <Input
          id="departureTime"
          type="time"
          bind:value={form.departureTime}
          class="pr-1"
        />
        <Field.Error>{errors.departureTime}</Field.Error>
      </Field.Field>

      <Field.Field data-invalid={errors.tankBalanceBefore ? true : undefined}>
        <Field.Label for="tankBalanceBefore">Balance in tank</Field.Label>
        <InputGroup.Root>
          <NumberInput
            id="tankBalanceBefore"
            grouped
            bind:value={form.tankBalanceBefore}
            wholeDigits={3}
          />
          <InputGroup.Addon align="inline-end">L</InputGroup.Addon>
        </InputGroup.Root>
        <Field.Error>{errors.tankBalanceBefore}</Field.Error>
      </Field.Field>
    </div>

    <!-- What goes on this line is still asked of GSU (MPP-139). -->
    <Field.Field data-invalid={errors.oilLubricant ? true : undefined}>
      <Field.Label for="oilLubricant">Oil / Fuel lubricant</Field.Label>
      <Input id="oilLubricant" bind:value={form.oilLubricant} maxlength={100} />
      <Field.Error>{errors.oilLubricant}</Field.Error>
    </Field.Field>

    <Field.Field data-invalid={errors.odometerStart ? true : undefined}>
      <Field.Label for="odometerStart" note="if any"
        >Odometer reading at the start</Field.Label
      >
      <InputGroup.Root>
        <NumberInput
          id="odometerStart"
          grouped
          bind:value={form.odometerStart}
          wholeDigits={7}
          decimals={0}
        />
        <InputGroup.Addon align="inline-end">km</InputGroup.Addon>
      </InputGroup.Root>
      <Field.Error>{errors.odometerStart}</Field.Error>
    </Field.Field>
  </Field.Set>

  <Field.Set>
    <Field.Legend class={LEGEND}>Signatories</Field.Legend>
    <Field.Field data-invalid={errors.dttApprovedBy ? true : undefined}>
      <Field.Label id="dttApprovedBy-label" required>Approved by</Field.Label>
      <SearchPicker
        id="dttApprovedBy"
        aria-labelledby="dttApprovedBy-label"
        items={form.everyone}
        bind:value={form.dttApprovedBy}
        placeholder="Choose the approver"
        searchPlaceholder="Search employees..."
        required
      />
      <Field.Error>{errors.dttApprovedBy}</Field.Error>
    </Field.Field>
  </Field.Set>
</Field.Group>
