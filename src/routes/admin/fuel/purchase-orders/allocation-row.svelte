<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { X } from "@lucide/svelte/icons";
  import type { Allocation } from "./add-po-form.svelte.js";
  import NumberInput from "@/components/number-input.svelte";
  import { amountInCentavos, litersForPesos, toHundredths } from "./po-math.js";
  import type { UnitOption } from "./po-types.js";

  /**
   * One allocation as one row: the unit, its size, and a remove button.
   *
   * The size can be typed either way: in liters, or as a budget in pesos.
   * Each field fills in the other at the fuel's unit cost, so GSU can type
   * whichever the unit was given. Only the liters are saved; the pesos are
   * worked out from them.
   *
   *   10 L at ₱65.50/L   → the pesos field shows 655.00
   *   ₱655 at ₱65.50/L   → the liters field shows 10
   *
   * From a container width of 24rem up the row is one line (unit, liters,
   * pesos, ×). Below that it wraps: unit and × on top, liters and pesos
   * under them. A container query rather than a screen width, because the
   * list is narrower than the screen: the stepper sits beside it. The line
   * between two-line rows is drawn by the list in po-allocation-step.svelte.
   */
  let {
    allocation,
    unitOptions,
    taken,
    unitCostC,
    fuelLabel,
    removable,
    showErrors,
    onPickUnit,
    onRemove,
    onchange,
  }: {
    allocation: Allocation;
    /** The active divisions, sections, units and offices, in level order. */
    unitOptions: UnitOption[];
    /** Units another allocation of this fuel already has; offered disabled. */
    taken: Set<string>;
    /** The fuel's unit cost on the PO, in centavos. More than zero. */
    unitCostC: number;
    /** "Gasoline" or "Diesel", for the fields' accessible names. */
    fuelLabel: string;
    /** False on a fuel's only allocation: a fuel on the PO needs one. */
    removable: boolean;
    /** After a refused Save: mark this row's empty unit or liters. */
    showErrors: boolean;
    onPickUnit: (orgUnitFk: string) => void;
    onRemove: () => void;
    /** Called on every change, so the fuel's error message can be cleared. */
    onchange: () => void;
  } = $props();

  const litersH = $derived(toHundredths(allocation.liters));

  /** What the liters cost, in pesos, or null while there are none. */
  const amount = $derived(
    litersH === null ? null : amountInCentavos(litersH, unitCostC) / 100,
  );

  /**
   * The pesos exactly as typed. Liters are rounded to 0.01 L, so ₱100 at
   * ₱65.50/L becomes 1.53 L, which costs ₱100.22. While the pesos are being
   * typed, the field keeps showing 100 rather than jumping to 100.22 under
   * the cursor. It shows the worked-out amount again once the liters are
   * typed instead, or when the cursor leaves the field.
   */
  let typedPesos = $state<number | null>(null);

  const pesos = $derived.by(() => {
    const typedC = toHundredths(typedPesos);
    if (typedC !== null && litersForPesos(typedC, unitCostC) === litersH) {
      return typedPesos;
    }
    return amount;
  });

  function setPesos(value: number | null) {
    typedPesos = value;
    const centavos = toHundredths(value);
    allocation.liters =
      centavos === null ? null : litersForPesos(centavos, unitCostC) / 100;
    onchange();
  }

  function unitLabel(unit: UnitOption) {
    return unit.abbr ? `${unit.orgUnitName} (${unit.abbr})` : unit.orgUnitName;
  }

  const chosenUnit = $derived(
    unitOptions.find((u) => String(u.orgUnitPk) === allocation.orgUnitFk),
  );
</script>

<!--
  In the DOM the fields come in typing order (unit, liters, pesos, ×), so Tab
  follows them on both layouts; the grid places them.
-->
<div
  data-allocation-id={allocation.id}
  class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-1.5 @sm:grid-cols-[minmax(0,1fr)_5rem_7rem_2rem] @sm:items-center"
>
  <Select.Root
    type="single"
    value={allocation.orgUnitFk}
    onValueChange={onPickUnit}
  >
    <Select.Trigger
      class="col-span-2 row-start-1 w-full @sm:col-span-1"
      aria-label="{fuelLabel} allocation: unit"
      aria-invalid={showErrors && !allocation.orgUnitFk ? true : undefined}
      suffix={chosenUnit?.abbr && `(${chosenUnit.abbr})`}
    >
      {#if chosenUnit}
        {chosenUnit.orgUnitName}
      {:else}
        <span class="text-muted-foreground">Choose a unit</span>
      {/if}
    </Select.Trigger>
    <Select.Content>
      {#each unitOptions as unit (unit.orgUnitPk)}
        <Select.Item
          value={String(unit.orgUnitPk)}
          label={unitLabel(unit)}
          disabled={taken.has(String(unit.orgUnitPk))}
        />
      {/each}
    </Select.Content>
  </Select.Root>

  <InputGroup.Root
    class="col-start-1 row-start-2 @sm:col-start-2 @sm:row-start-1"
  >
    <!-- Liters up to 999.99, as on the PO itself. -->
    <NumberInput
      grouped
      wholeDigits={3}
      placeholder="0"
      bind:value={allocation.liters}
      oninput={onchange}
      aria-label="{fuelLabel} allocation: liters"
      aria-invalid={showErrors && !litersH ? true : undefined}
    />
    <InputGroup.Addon align="inline-end">L</InputGroup.Addon>
  </InputGroup.Root>

  <InputGroup.Root
    class="col-start-2 row-start-2 @sm:col-start-3 @sm:row-start-1"
  >
    <InputGroup.Addon>₱</InputGroup.Addon>
    <!--
      Pesos up to 999,999.99: 999.99 L at ₱999.99/L is just under that. On
      leaving the field it shows what the liters really cost, as 100.22.
    -->
    <NumberInput
      grouped
      wholeDigits={6}
      padDecimals
      placeholder="0.00"
      bind:value={() => pesos, setPesos}
      onblur={() => (typedPesos = null)}
      aria-label="{fuelLabel} allocation: pesos"
    />
  </InputGroup.Root>

  <!--
    Unavailable on a fuel's only allocation, with no reason shown: that row
    is plainly the only one, and the status above it says what is left.
  -->
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="text-muted-foreground hover:text-destructive hover:bg-destructive/10 col-start-3 row-start-1 size-11 @sm:col-start-4 @sm:h-8 @sm:w-8"
    disabled={!removable}
    onclick={onRemove}
    aria-label="Remove this allocation"
  >
    <X />
  </Button>
</div>
