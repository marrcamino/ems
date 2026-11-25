<script lang="ts">
  import { enhance } from "$app/forms";
  import DateInput from "$lib/components/date-input.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { paperSizeLabel as getPaperSizeLabel } from "$lib/paper-sizes";
  import NumberInput from "@/components/number-input.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import ScrollArea from "@/components/ui/scroll-area/scroll-area.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import { ArrowLeft, CircleAlert } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { DETAIL_FIELDS, type PaperPoForm } from "./paper-po-form.svelte.js";
  import { MAX_REAMS, type OfficeOption } from "./paper-po-types";

  /**
   * Step 3 of the paper PO dialog: the reams of its own share each office
   * leaves with GSU, kept in the stock room for that office (one with no room
   * to store it), and the stock no. of each size kept there. On a new PO, the
   * rest of each share is handed over on the date here; what is left is
   * handed over later from the PO card, only to its own office. On an edited
   * PO, only the stock numbers change here.
   */
  let {
    form,
    offices,
    submitting = $bindable(false),
    onBack,
    onSaved,
    onRefused,
  }: {
    form: PaperPoForm;
    offices: OfficeOption[];
    submitting?: boolean;
    onBack: () => void;
    onSaved: () => void;
    /** The server refused something on an earlier step. */
    onRefused: (step: "details" | "distribute") => void;
  } = $props();

  const editing = $derived(form.editingPk !== null);
  const sizes = $derived(form.sizesOnPo);
  const columns = $derived(
    `minmax(8rem,1fr) repeat(${sizes.length}, 4rem) 2rem`,
  );
  const todayDate = today(getLocalTimeZone());

  /** Errors with no field of their own on this step, shown in the footer. */
  const stepErrors = $derived(
    Object.entries(form.errors)
      .filter(
        ([field]) =>
          !DETAIL_FIELDS.includes(field) &&
          !["distribution", "handOverOn", "stockNumbers"].includes(field),
      )
      .map(([, message]) => message),
  );

  /** Each office in the distribution, in its order there. */
  const officeRows = $derived(
    form.rows
      .filter((r) => r.orgUnitFk)
      .map((r) => ({
        orgUnitFk: r.orgUnitFk,
        office: offices.find((o) => String(o.orgUnitPk) === r.orgUnitFk),
      })),
  );
</script>

<form
  class="flex min-h-0 flex-1 flex-col gap-4"
  method="POST"
  action="?/savePaperPurchaseOrder"
  novalidate
  autocomplete="off"
  use:enhance={({ cancel }) => {
    form.errors = form.stockErrors();
    if (Object.keys(form.errors).length > 0) {
      cancel();
      return;
    }
    submitting = true;
    return async ({ result, update }) => {
      submitting = false;
      if (result.type === "success") {
        toast.success(
          `PO ${form.poNumber.trim()} ${editing ? "saved" : "added"}`,
        );
        await update({ reset: false, invalidateAll: true });
        onSaved();
        return;
      }
      if (result.type === "failure") {
        const data = result.data as
          { error?: string; field?: string } | undefined;
        if (data?.field && data.error) {
          form.errors[data.field] = data.error;
          if (DETAIL_FIELDS.includes(data.field)) onRefused("details");
          else if (data.field === "distribution") onRefused("distribute");
          return;
        }
      }
      toast.error(editing ? "Changes not saved" : "Purchase order not added", {
        description:
          result.type === "failure"
            ? ((result.data as { error?: string } | undefined)?.error ??
              "Try again.")
            : "Try again. If it keeps happening, contact ICT.",
      });
    };
  }}
>
  <HiddenInput name="payload" value={form.payload} />

  <ScrollArea
    class="-mx-4 flex min-h-0 flex-1 flex-col"
    viewPortClasses="h-auto px-4 scroll-fade-y"
    type="auto"
  >
    <div class="grid gap-2 pb-1">
      {#if !editing}
        <!--
          One line per office in the distribution: an office's paper is its
          own, from its own PR, so it can only leave part of its own share
          with GSU, never another office's.
        -->
        <div
          class="text-muted-foreground grid items-end gap-x-2 text-xs"
          style:grid-template-columns={columns}
        >
          <span>Left with GSU by</span>
          {#each sizes as size (size)}
            <span class="text-right">{getPaperSizeLabel(size)}</span>
          {/each}
          <span></span>
        </div>

        {#each officeRows as row (row.orgUnitFk)}
          {@const reams = form.leftWithGsu[row.orgUnitFk]}
          {#if reams}
            <div
              class="grid items-start gap-x-2"
              style:grid-template-columns={columns}
            >
              <span class="truncate pt-1.5 text-sm">
                {row.office?.orgUnitName ?? "Office"}
              </span>
              {#each sizes as size (size)}
                {@const share = form.shareOf(row.orgUnitFk, size)}
                <div class="grid gap-0.5">
                  <NumberInput
                    class="text-right"
                    wholeDigits={String(MAX_REAMS).length}
                    decimals={0}
                    placeholder="0"
                    disabled={share === 0}
                    bind:value={reams[size]}
                    oninput={() => {
                      form.clearError("stock");
                      form.clearError("stockNumbers");
                    }}
                    aria-label="{row.office?.abbr ??
                      'Office'} leaves: {getPaperSizeLabel(size)} reams"
                  />
                  <span
                    class="text-muted-foreground text-right text-xs tabular-nums"
                  >
                    of {share}
                  </span>
                </div>
              {/each}
              <span></span>
            </div>
          {/if}
        {/each}

        <Field.Field
          class="mt-2 w-48 pt-4"
          data-invalid={form.errors.handOverOn ? true : undefined}
        >
          <Field.Label id="handOverOn-label" required>
            Date handed over
          </Field.Label>
          <DateInput
            id="handOverOn"
            aria-labelledby="handOverOn-label"
            bind:value={
              () => form.handOverOn,
              (date) => {
                form.handOverOn = date;
                form.clearError("handOverOn");
              }
            }
            minValue={form.poDate}
            maxValue={todayDate}
            aria-invalid={form.errors.handOverOn ? true : undefined}
          />
          <Field.Error>{form.errors.handOverOn}</Field.Error>
        </Field.Field>
      {/if}

      <!-- The PO's "Stock/Property No.", for each size kept in the stock room. -->
      <!-- The line sits on a wrapper: on a fieldset it runs through the legend. -->
      <div class={[!editing && "mt-2 border-t pt-4"]}>
        <fieldset
          class="grid gap-2"
          data-invalid={form.errors.stockNumbers ? true : undefined}
        >
          <legend class="mb-2 text-sm font-medium">Stock/Property No.</legend>
          {#each sizes as size (size)}
            {@const needsStockNumber = form.needsStockNumber(size)}
            {@const paperSizeLabel = getPaperSizeLabel(size)}
            <div class="grid grid-cols-[4rem_1fr] items-center gap-x-3">
              <!-- Required, with its star, once some of the size is left with GSU. -->
              <Label
                for="stock-number-{size}"
                class="font-normal"
                required={needsStockNumber}
              >
                {paperSizeLabel}
              </Label>
              <Input
                id="stock-number-{size}"
                required={needsStockNumber}
                bind:value={form.stockNumbers[size]}
                oninput={() => form.clearError("stockNumbers")}
                disabled={!needsStockNumber}
                placeholder={needsStockNumber ? "" : "Not in the stock room"}
                maxlength={50}
                aria-label="{paperSizeLabel} stock no."
                aria-invalid={form.errors.stockNumbers &&
                needsStockNumber &&
                !form.stockNumbers[size].trim()
                  ? true
                  : undefined}
              />
            </div>
          {/each}
          {#if form.errors.stockNumbers}
            <p class="text-destructive text-sm" role="alert">
              {form.errors.stockNumbers}
            </p>
          {/if}
        </fieldset>
      </div>
    </div>
  </ScrollArea>

  <div class="-mx-4 grid gap-2.5 border-t px-4 pt-3">
    {#if stepErrors.length > 0}
      <p class="text-destructive flex gap-1.5 text-sm" role="alert">
        <CircleAlert class="mt-0.5 size-4 shrink-0" />
        <span>{stepErrors.join(" ")}</span>
      </p>
    {/if}

    <div class="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onclick={onBack}
        disabled={submitting}
      >
        <ArrowLeft />
        Back
      </Button>
      <Button type="submit" class="flex-1 sm:flex-none" disabled={submitting}>
        {#if submitting}
          <Spinner />
        {/if}
        {editing ? "Save changes" : "Save purchase order"}
      </Button>
    </div>
  </div>
</form>
