<script lang="ts">
  import { enhance } from "$app/forms";
  import NumberInput from "$lib/components/number-input.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import HiddenInput from "$lib/components/ui/hidden-input.svelte";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { formatLiters, formatPesos } from "$lib/utils/format-number.js";
  import { shortNumber } from "$lib/utils/form-numbers.js";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import type { TransactionDetails } from "./issuance.server";
  import { LEGEND } from "./new-withdrawal-form.svelte.js";
  import {
    amountInCentavos,
    litersForPesos,
  } from "./purchase-orders/po-math.js";

  /**
   * Complete: what GSU types from the paper forms once they are back
   * (point 9 of "Recording a fuel issuance"). On a withdrawal, the
   * supplier's numbers; on anything with a trip ticket, the lines after the
   * trip. A withdrawal whose tank lines are still empty becomes Incomplete;
   * a trip with no slip must have every line.
   */
  let {
    open = $bindable(false),
    details,
  }: {
    open: boolean;
    details: TransactionDetails | null;
  } = $props();

  let unitPrice = $state<number | null>(null);
  let amount = $state<number | null>(null);
  let departureTime = $state("");
  let arrivalTime = $state("");
  let tankBalanceBefore = $state<number | null>(null);
  let purchasedLiters = $state<number | null>(null);
  let litersUsed = $state<number | null>(null);
  let tankBalanceAfter = $state<number | null>(null);
  let odometerEnd = $state<number | null>(null);
  let errors = $state<Record<string, string>>({});
  let submitting = $state(false);

  $effect(() => {
    if (!open || !details) return;
    const { values, completion } = details;
    unitPrice = completion.unitPrice;
    amount = completion.amount;
    departureTime = values.departureTime;
    arrivalTime = completion.arrivalTime;
    tankBalanceBefore = values.tankBalanceBefore;
    purchasedLiters = values.purchasedLiters;
    litersUsed = completion.litersUsed;
    tankBalanceAfter = completion.tankBalanceAfter;
    odometerEnd = completion.odometerEnd;
    errors = {};
  });

  const isWithdrawal = $derived(details?.kind === "withdrawal");
  const hasTrip = $derived(!!details?.dttNumber);
  const priceBased = $derived(details?.po?.poType === "price");

  /** A liter-based slip takes the liters requested at the PO's unit cost. */
  const literBased = $derived.by(() => {
    if (!details?.po || priceBased) return null;
    const litersH = Math.round((details.values.liters ?? 0) * 100);
    const priceC = details.po.unitCostC;
    return { litersH, priceC, amountC: amountInCentavos(litersH, priceC) };
  });

  /** On a price-based slip, the liters the amount buys at the unit price. */
  const pumpedH = $derived(
    unitPrice && amount
      ? litersForPesos(Math.round(amount * 100), Math.round(unitPrice * 100))
      : null,
  );

  const payload = $derived(
    JSON.stringify({
      id: details?.id,
      unitPrice,
      amount,
      departureTime,
      arrivalTime,
      tankBalanceBefore,
      purchasedLiters,
      litersUsed,
      tankBalanceAfter,
      odometerEnd,
    }),
  );

  const title = $derived(
    details ? `Complete CN ${shortNumber(details.controlNumber, 3)}` : "",
  );
</script>

<!-- One liters line of the trip ticket. -->
{#snippet liters(
  id: string,
  label: string,
  get: () => number | null,
  set: (value: number | null) => void,
)}
  <Field.Field data-invalid={errors[id] ? true : undefined}>
    <Field.Label for={id} required={!isWithdrawal}>{label}</Field.Label>
    <InputGroup.Root>
      <NumberInput {id} grouped bind:value={get, set} wholeDigits={3} />
      <InputGroup.Addon align="inline-end">L</InputGroup.Addon>
    </InputGroup.Root>
    <Field.Error>{errors[id]}</Field.Error>
  </Field.Field>
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content
    class="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg"
    onOpenAutoFocus={(event) => {
      event.preventDefault();
      document
        .querySelector<HTMLElement>("#complete-form input:not([disabled])")
        ?.focus();
    }}
  >
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>
        Type what is written on the forms that came back, then press Complete.
      </Dialog.Description>
    </Dialog.Header>

    {#if details}
      <form
        id="complete-form"
        class="flex min-h-0 flex-col gap-4"
        method="POST"
        action="?/completeTransaction"
        autocomplete="off"
        use:enhance={() => {
          errors = {};
          submitting = true;
          return async ({ result, update }) => {
            submitting = false;
            if (result.type === "success") {
              await update();
              open = false;
              if (result.data?.status === "incomplete") {
                toast.warning(
                  `${title.replace("Complete ", "")} is incomplete`,
                  {
                    description:
                      "Type the tank lines when the trip ticket is back, then press Complete again.",
                  },
                );
              } else {
                toast.success(`${title.replace("Complete ", "")} completed`);
              }
              return;
            }
            if (result.type === "failure") {
              const refusal = result.data as
                { error?: string; field?: string } | undefined;
              const field = refusal?.field;
              if (field && refusal?.error && document.getElementById(field)) {
                errors = { [field]: refusal.error };
                await tick();
                document
                  .getElementById(field)
                  ?.scrollIntoView({ block: "center" });
                return;
              }
              toast.error("Not completed", {
                description: refusal?.error ?? "Try again.",
              });
              return;
            }
            toast.error("Not completed", {
              description: "Try again. If it keeps happening, contact ICT.",
            });
          };
        }}
      >
        <HiddenInput name="payload" value={payload} />
        <ScrollArea
          class="-mx-4 flex min-h-0 flex-col"
          viewPortClasses="h-auto px-4 pb-1 scroll-fade-y"
          type="auto"
        >
          <Field.Group class="gap-6">
            {#if isWithdrawal}
              <Field.Set>
                <Field.Legend class={LEGEND}>Withdrawal slip</Field.Legend>
                {#if literBased && details.po}
                  <!-- The supplier writes no numbers on a liter-based slip. -->
                  <p class="text-sm">
                    PO {details.po.poNumber} is liter-based, so the supplier writes
                    no numbers. EMS records the
                    <span class="font-medium tabular-nums"
                      >{formatLiters(literBased.litersH, {
                        dropZeros: true,
                      })}</span
                    >
                    requested at
                    <span class="tabular-nums"
                      >{formatPesos(literBased.priceC)}/L</span
                    >, which is
                    <span class="font-medium tabular-nums"
                      >{formatPesos(literBased.amountC)}</span
                    >.
                  </p>
                {:else}
                  <div class="grid gap-4 sm:grid-cols-2">
                    <Field.Field
                      data-invalid={errors.unitPrice ? true : undefined}
                    >
                      <Field.Label for="unitPrice" required
                        >Unit price</Field.Label
                      >
                      <InputGroup.Root>
                        <InputGroup.Addon>₱</InputGroup.Addon>
                        <NumberInput
                          id="unitPrice"
                          grouped
                          bind:value={unitPrice}
                          wholeDigits={4}
                          padDecimals
                          required
                        />
                        <InputGroup.Addon align="inline-end"
                          >/L</InputGroup.Addon
                        >
                      </InputGroup.Root>
                      <Field.Error>{errors.unitPrice}</Field.Error>
                    </Field.Field>
                    <Field.Field
                      data-invalid={errors.amount ? true : undefined}
                    >
                      <Field.Label for="amount" required
                        >Total amount</Field.Label
                      >
                      <InputGroup.Root>
                        <InputGroup.Addon>₱</InputGroup.Addon>
                        <NumberInput
                          id="amount"
                          grouped
                          bind:value={amount}
                          wholeDigits={6}
                          padDecimals
                          required
                        />
                      </InputGroup.Root>
                      <Field.Error>{errors.amount}</Field.Error>
                    </Field.Field>
                  </div>
                  <p class="text-muted-foreground text-sm tabular-nums">
                    Liters pumped:
                    <span class="text-foreground font-medium">
                      {pumpedH === null
                        ? "—"
                        : formatLiters(pumpedH, { dropZeros: true })}
                    </span>
                  </p>
                {/if}
              </Field.Set>
            {/if}

            {#if hasTrip}
              <Field.Set>
                <Field.Legend class={LEGEND}>Trip ticket</Field.Legend>
                <!-- A second press on an Incomplete one needs every tank line. -->
                {#if isWithdrawal && details.status === "out"}
                  <p class="text-muted-foreground text-sm">
                    If the trip ticket is not back yet, leave its tank lines
                    empty. The withdrawal is then marked Incomplete.
                  </p>
                {/if}
                <div class="grid gap-4 sm:grid-cols-2">
                  <Field.Field
                    data-invalid={errors.departureTime ? true : undefined}
                  >
                    <Field.Label for="departureTime" required={!isWithdrawal}
                      >Departure time</Field.Label
                    >
                    <Input
                      id="departureTime"
                      type="time"
                      bind:value={departureTime}
                      class="pr-1"
                    />
                    <Field.Error>{errors.departureTime}</Field.Error>
                  </Field.Field>
                  <Field.Field
                    data-invalid={errors.arrivalTime ? true : undefined}
                  >
                    <Field.Label for="arrivalTime" required={!isWithdrawal}
                      >Arrival time</Field.Label
                    >
                    <Input
                      id="arrivalTime"
                      type="time"
                      bind:value={arrivalTime}
                      class="pr-1"
                    />
                    <Field.Error>{errors.arrivalTime}</Field.Error>
                  </Field.Field>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  {@render liters(
                    "tankBalanceBefore",
                    "Balance in tank",
                    () => tankBalanceBefore,
                    (v) => (tankBalanceBefore = v),
                  )}
                  {#if details.kind === "reimbursed"}
                    {@render liters(
                      "purchasedLiters",
                      "Purchased during trip",
                      () => purchasedLiters,
                      (v) => (purchasedLiters = v),
                    )}
                  {/if}
                  {@render liters(
                    "litersUsed",
                    "Used during the trip",
                    () => litersUsed,
                    (v) => (litersUsed = v),
                  )}
                  {@render liters(
                    "tankBalanceAfter",
                    "Balance after the trip",
                    () => tankBalanceAfter,
                    (v) => (tankBalanceAfter = v),
                  )}
                </div>

                <Field.Field
                  data-invalid={errors.odometerEnd ? true : undefined}
                >
                  <Field.Label for="odometerEnd" note="if any"
                    >Odometer reading after the trip</Field.Label
                  >
                  <InputGroup.Root>
                    <NumberInput
                      id="odometerEnd"
                      grouped
                      bind:value={odometerEnd}
                      wholeDigits={7}
                      decimals={0}
                    />
                    <InputGroup.Addon align="inline-end">km</InputGroup.Addon>
                  </InputGroup.Root>
                  <Field.Error>{errors.odometerEnd}</Field.Error>
                </Field.Field>
              </Field.Set>
            {/if}
          </Field.Group>
        </ScrollArea>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
            Complete
          </Button>
        </div>
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>
