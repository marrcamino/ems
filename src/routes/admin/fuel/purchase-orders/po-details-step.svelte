<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import type { Supplier } from "@/types";
  import NumberFlow, { NumberFlowGroup } from "@number-flow/svelte";
  import { ArrowRight, Store } from "@lucide/svelte/icons";
  import { EASE_OUT_CSS, easeOut } from "$lib/utils/animation.js";
  import { LOCALE, PESO_FORMAT } from "$lib/utils/format-number.js";
  import { fade } from "svelte/transition";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import type { AddPurchaseOrderForm } from "./add-po-form.svelte.js";
  import NumberInput from "@/components/number-input.svelte";
  import { FUEL_LABELS, FUELS, type Fuel } from "./po-math.js";

  /**
   * Step 1 of the add PO dialog: the PO as it is printed. PO number, date,
   * supplier, and a row for each fuel with its quantity and unit cost.
   */
  let {
    form,
    suppliers,
    poNumberInput = $bindable(null),
    onNext,
    onCancel,
    onManageSuppliers,
  }: {
    form: AddPurchaseOrderForm;
    /** Active suppliers only: a new PO cannot name an archived one. */
    suppliers: Supplier[];
    /** Lets the dialog put the cursor here when it opens. */
    poNumberInput?: HTMLInputElement | null;
    onNext: () => void;
    onCancel: () => void;
    /** Closes the dialog and opens the suppliers dialog instead. */
    onManageSuppliers: () => void;
  } = $props();

  const errors = $derived(form.errors);

  /** A PO is dated the day it was issued, so never later than today. */
  const todayDate = today(getLocalTimeZone());

  /** The "—" cover appearing or going. Opacity only, so no motion. */
  const DASH_FADE = { duration: 200, easing: easeOut };

  /**
   * Faster than NumberFlow's own 900ms, which felt slow for a number that
   * changes on every key typed. The digits roll for 500ms on the app's
   * strong ease-out, so most of the movement is over in the first 150ms,
   * and fade over 250ms.
   */
  const ROLL = {
    transformTiming: { duration: 500, easing: EASE_OUT_CSS },
    opacityTiming: { duration: 250, easing: "ease-out" },
  };
</script>

<div class="-mx-4 min-h-0 overflow-y-auto px-4 pb-1">
  <Field.Group class="gap-4">
    <div class="grid grid-cols-2 gap-2">
      <Field.Field data-invalid={errors.poNumber ? true : undefined}>
        <Field.Label for="poNumber">PO number</Field.Label>
        <Input
          id="poNumber"
          bind:ref={poNumberInput}
          bind:value={form.poNumber}
          oninput={() => form.clearError("poNumber")}
          placeholder="2026-03-22"
          maxlength={50}
          aria-invalid={errors.poNumber ? true : undefined}
        />
        <Field.Error>{errors.poNumber}</Field.Error>
      </Field.Field>

      <Field.Field data-invalid={errors.poDate ? true : undefined}>
        <!-- DateInput is labelled by id: a label's `for` cannot reach it. -->
        <Field.Label id="poDate-label">PO date</Field.Label>
        <DateInput
          id="poDate"
          aria-labelledby="poDate-label"
          bind:value={
            () => form.poDate,
            (date) => {
              form.poDate = date;
              form.clearError("poDate");
            }
          }
          maxValue={todayDate}
          aria-invalid={errors.poDate ? true : undefined}
        />
        <Field.Error>{errors.poDate}</Field.Error>
      </Field.Field>
    </div>

    <Field.Field data-invalid={errors.supplierFk ? true : undefined}>
      <Field.Label for="supplierFk">Supplier</Field.Label>
      {#if suppliers.length > 0}
        <Select.Root
          type="single"
          value={form.supplierFk}
          onValueChange={(value) => {
            form.supplierFk = value;
            form.clearError("supplierFk");
          }}
        >
          <Select.Trigger
            id="supplierFk"
            class="w-full"
            aria-invalid={errors.supplierFk ? true : undefined}
          >
            {suppliers.find((s) => String(s.supplierPk) === form.supplierFk)
              ?.supplierName ?? "Choose the supplier"}
          </Select.Trigger>
          <Select.Content>
            {#each suppliers as s (s.supplierPk)}
              <Select.Item
                value={String(s.supplierPk)}
                label={s.supplierName}
              />
            {/each}
          </Select.Content>
        </Select.Root>
        <Field.Error>{errors.supplierFk}</Field.Error>
      {:else}
        <!--
          No supplier to pick yet. The step that fixes it sits right here,
          rather than a disabled button somewhere else.
        -->
        <div
          class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm"
        >
          No active suppliers yet.
          <Button size="sm" variant="outline" onclick={onManageSuppliers}>
            <Store />
            Manage suppliers
          </Button>
        </div>
      {/if}
    </Field.Field>

    <!--
      One row per fuel, as on the PO. Amount = liters × unit cost; it is
      worked out, not typed. A fuel that is not on the PO is left blank.
    -->
    <fieldset class="grid gap-2">
      <legend class="mb-2 text-sm font-medium">Fuel on the PO</legend>
      <!--
        One group, so a fuel's amount and the total below it roll to their
        new values together when a quantity or unit cost is typed, rather
        than one after the other. With reduced motion they change at once.
      -->
      <div class="relative">
        <NumberFlowGroup>
          <div
            class="text-muted-foreground grid grid-cols-[3.5rem_1fr_1fr_5rem] gap-x-2 text-xs mb-1"
          >
            <span></span>
            <span>Quantity</span>
            <span>Unit cost</span>
            <span class="text-right">Amount</span>
          </div>

          {#each FUELS as fuel (fuel)}
            {@const onPo = form.fuelsOnPo.includes(fuel)}
            <div
              class="grid grid-cols-[3.5rem_1fr_1fr_5rem] items-center gap-x-2 space-y-2"
            >
              <span class="text-sm">{FUEL_LABELS[fuel]}</span>
              <InputGroup.Root>
                <!-- Up to 999.99, see MAX_HUNDREDTHS in po-math.ts. -->
                <NumberInput
                  grouped
                  wholeDigits={3}
                  placeholder="0"
                  bind:value={form.rows[fuel].liters}
                  oninput={() => form.clearError(fuel)}
                  aria-label="{FUEL_LABELS[fuel]} quantity in liters"
                  aria-invalid={errors[fuel] ? true : undefined}
                />
                <InputGroup.Addon align="inline-end">L</InputGroup.Addon>
              </InputGroup.Root>
              <InputGroup.Root>
                <InputGroup.Addon>₱</InputGroup.Addon>
                <NumberInput
                  grouped
                  wholeDigits={3}
                  padDecimals
                  placeholder="0.00"
                  bind:value={form.rows[fuel].unitCost}
                  oninput={() => form.clearError(fuel)}
                  aria-label="{FUEL_LABELS[fuel]} unit cost in pesos per liter"
                  aria-invalid={errors[fuel] ? true : undefined}
                  autocorrect="off"
                />
                <InputGroup.Addon align="inline-end">/L</InputGroup.Addon>
              </InputGroup.Root>
              <!--
              The amount is always a NumberFlow, at ₱0.00 while the fuel is
              not on the PO, so typing a quantity and unit cost rolls it up
              from zero, and clearing them rolls it back down. While it is
              zero, a "—" covers it: laid over the number and filled with the
              dialog's own color (`bg-popover`, which in dark mode is lighter
              than `bg-background`), so the zero underneath does not show.
              The cover fades in and out; the number only rolls.
            -->
              <span class="relative flex justify-end text-sm tabular-nums">
                <span aria-hidden={!onPo}>
                  <NumberFlow
                    value={onPo ? form.amountC(fuel) / 100 : 0}
                    locales={LOCALE}
                    format={PESO_FORMAT}
                    {...ROLL}
                  />
                </span>
                {#if !onPo}
                  <span
                    class="bg-popover text-muted-foreground absolute inset-0 flex items-center justify-end"
                    transition:fade={DASH_FADE}
                  >
                    —<span class="sr-only">Not on this PO</span>
                  </span>
                {/if}
              </span>
            </div>
            {#if errors[fuel]}
              <p class="text-destructive text-sm" role="alert">
                {errors[fuel]}
              </p>
            {/if}
          {/each}
          <div
            class="flex items-center justify-between border-t pt-2 text-sm font-medium"
          >
            <span>Total</span>
            <span class="tabular-nums">
              <NumberFlow
                value={form.totalC / 100}
                locales={LOCALE}
                format={PESO_FORMAT}
                {...ROLL}
              />
            </span>
          </div>
        </NumberFlowGroup>
        {#if errors.fuel}
          <p class="text-destructive text-sm" role="alert">{errors.fuel}</p>
        {:else}
          <p class="text-muted-foreground text-xs">
            Leave a fuel blank when it is not on the PO.
          </p>
        {/if}
      </div>
    </fieldset>
  </Field.Group>
</div>

<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
  <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
  <Button type="button" onclick={onNext}>
    Next
    <ArrowRight />
  </Button>
</div>
