<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { PAPER_SIZES } from "$lib/paper-sizes";
  import NumberInput from "@/components/number-input.svelte";
  import ScrollArea from "@/components/ui/scroll-area/scroll-area.svelte";
  import NumberFlow from "@number-flow/svelte";
  import { NUMBER_ROLL } from "$lib/utils/animation.js";
  import { LOCALE } from "$lib/utils/format-number.js";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import type { Supplier } from "@/types";
  import { ArrowRight, Store } from "@lucide/svelte/icons";
  import type { PaperPoForm } from "./paper-po-form.svelte.js";
  import { MAX_REAMS } from "./paper-po-types";

  /** Step 1 of the paper PO dialog: the PO as it is printed. */
  let {
    form,
    suppliers,
    poNumberInput = $bindable(null),
    onNext,
    onCancel,
  }: {
    form: PaperPoForm;
    suppliers: Pick<Supplier, "supplierPk" | "supplierName">[];
    poNumberInput?: HTMLInputElement | null;
    onNext: () => void;
    onCancel: () => void;
  } = $props();

  const errors = $derived(form.errors);
  const todayDate = today(getLocalTimeZone());
</script>

<!-- The same scroll area as the other steps, not the browser's own bar. -->
<ScrollArea
  class="-mx-4 flex min-h-0 flex-1 flex-col"
  viewPortClasses="h-auto px-4 pb-1 scroll-fade-y"
  type="auto"
>
  <Field.Group class="gap-4">
    <div class="grid grid-cols-2 gap-2">
      <Field.Field data-invalid={errors.poNumber ? true : undefined}>
        <Field.Label for="paperPoNumber" required>PO number</Field.Label>
        <Input
          id="paperPoNumber"
          bind:ref={poNumberInput}
          bind:value={form.poNumber}
          oninput={() => form.clearError("poNumber")}
          placeholder="2026-11-05"
          maxlength={50}
          aria-invalid={errors.poNumber ? true : undefined}
          autocorrect="off"
          autocomplete="off"
        />
        <Field.Error>{errors.poNumber}</Field.Error>
      </Field.Field>

      <Field.Field data-invalid={errors.poDate ? true : undefined}>
        <Field.Label id="paperPoDate-label" required>PO date</Field.Label>
        <DateInput
          id="paperPoDate"
          aria-labelledby="paperPoDate-label"
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
      <Field.Label for="paperSupplierFk" required>Supplier</Field.Label>
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
            id="paperSupplierFk"
            class="w-full"
            aria-invalid={errors.supplierFk ? true : undefined}
          >
            {#if form.supplierFk}
              {suppliers.find((s) => String(s.supplierPk) === form.supplierFk)
                ?.supplierName}
            {:else}
              <span class="text-muted-foreground">Choose the supplier</span>
            {/if}
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
        <!-- The step that fixes it sits right here, as on the fuel PO. -->
        <div
          class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm"
        >
          No active suppliers yet.
          <Button size="sm" variant="outline" href="/suppliers">
            <Store />
            Manage suppliers
          </Button>
        </div>
      {/if}
    </Field.Field>

    <fieldset class="grid gap-2">
      <legend class="mb-2 text-sm font-medium">Bond paper on the PO</legend>
      {#each PAPER_SIZES as size (size.value)}
        <div class="grid grid-cols-[4rem_1fr_7rem] items-center gap-x-3">
          <span class="text-sm">{size.label}</span>
          <span class="text-muted-foreground text-xs">{size.measure}</span>
          <InputGroup.Root>
            <NumberInput
              grouped
              wholeDigits={String(MAX_REAMS).length}
              decimals={0}
              placeholder="0"
              bind:value={form.reams[size.value]}
              oninput={() => form.clearError("items")}
              aria-label="{size.label} reams"
              aria-invalid={errors.items ? true : undefined}
            />
            <InputGroup.Addon align="inline-end">reams</InputGroup.Addon>
          </InputGroup.Root>
        </div>
      {/each}
      <div
        class="flex items-center justify-between border-t pt-2 text-sm font-medium"
      >
        <span>Total</span>
        <span class="tabular-nums">
          <NumberFlow
            value={form.totalReams}
            locales={LOCALE}
            suffix={form.totalReams === 1 ? " ream" : " reams"}
            {...NUMBER_ROLL}
          />
        </span>
      </div>
      {#if errors.items}
        <p class="text-destructive text-sm" role="alert">{errors.items}</p>
      {/if}
    </fieldset>

    <Field.Field data-invalid={errors.remarks ? true : undefined}>
      <Field.Label for="paperPoRemarks">Remarks</Field.Label>
      <Textarea
        id="paperPoRemarks"
        bind:value={form.remarks}
        oninput={() => form.clearError("remarks")}
        rows={2}
        maxlength={255}
        aria-invalid={errors.remarks ? true : undefined}
      />
      <Field.Error>{errors.remarks}</Field.Error>
    </Field.Field>
  </Field.Group>
</ScrollArea>

<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
  <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
  <Button type="button" onclick={onNext}>
    Next
    <ArrowRight />
  </Button>
</div>
