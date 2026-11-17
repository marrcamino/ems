<script lang="ts">
  import NumberInput from "$lib/components/number-input.svelte";
  import AnimateContent from "$lib/components/transition/animate-content.svelte";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { EASE_OUT_CSS } from "$lib/utils/animation.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    formatPesos,
    LOCALE,
    PESO_FORMAT,
  } from "$lib/utils/format-number.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import NumberFlow from "@number-flow/svelte";
  import {
    amountInCentavos,
    litersForPesos,
  } from "./purchase-orders/po-math.js";
  import { formatDate } from "$lib/utils/format-date.js";
  import type { PoBalance } from "./withdrawal-row.js";

  /**
   * The "Liters requested" field of the New withdrawal form, with the balance
   * of the chosen PO above it. On a price-based PO it can switch to pesos,
   * and shows what the request comes to in the other unit beside the input.
   *
   * ```svelte
   * <RequestField
   *   {poBalance}
   *   bind:requestBy
   *   bind:litres
   *   bind:pesos
   *   error={errors.requested}
   * />
   * ```
   *
   * Only one of `litres` and `pesos` counts: `pesos` when the PO is
   * price-based and `requestBy` is "pesos", `litres` otherwise.
   */
  let {
    poBalance,
    requestBy = $bindable("liters"),
    litres = $bindable(null),
    pesos = $bindable(null),
    error,
  }: {
    /** The chosen PO and what the office has left on it; null until chosen. */
    poBalance: PoBalance | null;
    requestBy: "liters" | "pesos";
    litres: number | null;
    pesos: number | null;
    /** The server's refusal of the request, shown under the field. */
    error?: string;
  } = $props();

  const isPriceBased = $derived(poBalance?.poType === "price");
  // Only a price-based PO can be asked by pesos: its litres are not known
  // until the supplier pumps.
  const byPesos = $derived(isPriceBased && requestBy === "pesos");

  /**
   * On a price-based PO, what the typed request comes to in the other unit,
   * at the last known price: pesos for liters, liters for pesos. Zero until
   * something is typed, so the figure rolls up from zero.
   */
  const equivalent = $derived.by(() => {
    if (!poBalance) return 0;
    if (byPesos) {
      const centavos = Math.round((pesos ?? 0) * 100);
      return litersForPesos(centavos, poBalance.priceC) / 100;
    }
    const hundredths = Math.round((litres ?? 0) * 100);
    return amountInCentavos(hundredths, poBalance.priceC) / 100;
  });

  /** As formatLiters writes them: up to 2 decimals, then " L". */
  const LITERS_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };

  // The same quick roll as the amounts on the PO form (po-details-step).
  const ROLL = {
    transformTiming: { duration: 500, easing: EASE_OUT_CSS },
    opacityTiming: { duration: 250, easing: "ease-out" },
  };

  /** The request already takes all that is left, so "Use the rest" hides. */
  const isRest = $derived.by(() => {
    if (!poBalance) return false;
    return byPesos
      ? Math.round((pesos ?? 0) * 100) === poBalance.balanceC
      : Math.round((litres ?? 0) * 100) === poBalance.balanceH;
  });

  /**
   * The balance in the unit being requested, with the other unit beside it
   * on a price-based PO. Liters there are only an estimate, so they carry ≈.
   */
  const shown = $derived.by(() => {
    if (!poBalance) return null;
    const pesos = {
      value: poBalance.balanceC / 100,
      format: PESO_FORMAT,
      suffix: "",
    };
    const liters = {
      value: poBalance.balanceH / 100,
      format: LITERS_FORMAT,
      suffix: " L",
    };
    if (!isPriceBased)
      return { main: liters, other: null, mainIsEstimate: false };
    return byPesos
      ? { main: pesos, other: liters, mainIsEstimate: false }
      : { main: liters, other: pesos, mainIsEstimate: true };
  });

  // Liters on a price-based PO are only an estimate, so the rest is asked
  // for in pesos there. Offered only while less than 81 L is left (estimated
  // on a price-based PO): no single fueling takes hundreds of liters.
  const canUseRest = $derived(
    !!poBalance &&
      poBalance.balanceC > 0 &&
      poBalance.balanceH < 81_00 &&
      (byPesos || !isPriceBased),
  );
  function useRest() {
    if (!poBalance) return;
    if (byPesos) pesos = poBalance.balanceC / 100;
    else litres = poBalance.balanceH / 100;
  }

  /** Switching the unit carries the typed figure over at the PO's price. */
  function requestIn(unit: "liters" | "pesos") {
    if (!poBalance || unit === (byPesos ? "pesos" : "liters")) return;
    if (unit === "pesos") {
      pesos = litres
        ? amountInCentavos(Math.round(litres * 100), poBalance.priceC) / 100
        : null;
    } else {
      litres = pesos
        ? litersForPesos(Math.round(pesos * 100), poBalance.priceC) / 100
        : null;
    }
    requestBy = unit;
  }
</script>

<Field.Field data-invalid={error ? true : undefined}>
  <!--
    One box without a gap, so the balance and the warning below can slide in
    and out: their spacing is padding inside the part that slides.
  -->
  <div>
    {#if shown && poBalance}
      <!--
      The one figure on the form worth stopping at, so it is the largest. It
      stays what is really left while the request is typed, and rolls only
      when the request switches between liters and pesos.
    -->
      <AnimateContent delay={0} innerDelay={150}>
        <div class="pb-1 pt-2">
          <div
            id="po-balance"
            class="border-primary/25 bg-primary/5 rounded-xl border px-3 py-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="grid min-w-0">
                <p class="text-muted-foreground text-xs font-medium">
                  {isPriceBased
                    ? "The estimated balance is"
                    : "The current balance is"}
                </p>
                <p class="flex flex-wrap items-baseline gap-x-2 tabular-nums">
                  <span class="text-2xl font-semibold">
                    <NumberFlow
                      value={shown.main.value}
                      locales={LOCALE}
                      format={shown.main.format}
                      prefix={shown.mainIsEstimate ? "≈ " : ""}
                      suffix={shown.main.suffix}
                      {...ROLL}
                    />
                  </span>
                  {#if shown.other}
                    <span class="text-muted-foreground text-sm">
                      <NumberFlow
                        value={shown.other.value}
                        locales={LOCALE}
                        format={shown.other.format}
                        prefix={shown.mainIsEstimate ? "" : "≈ "}
                        suffix={shown.other.suffix}
                        {...ROLL}
                      />
                    </span>
                  {/if}
                </p>
              </div>

              {#if canUseRest && !isRest}
                <Button
                  variant="outline"
                  size="sm"
                  class="bg-background shrink-0"
                  onclick={useRest}
                >
                  Use the rest
                </Button>
              {/if}
            </div>

            {#if isPriceBased}
              <!-- Until pump prices are recorded, the PO's unit cost and date. -->
              <p class="text-muted-foreground mt-2 text-xs tabular-nums">
                Last known price was {formatPesos(poBalance.priceC)}/L on
                {formatDate(poBalance.poDate)}.
              </p>
            {/if}
          </div>
        </div>
      </AnimateContent>
    {/if}

    <!--
    On a price-based PO the request sits beside what it comes to
    in the other unit, which rolls as the figure is typed.
  -->
    <div
      class={["grid gap-x-2 gap-y-1", isPriceBased && "grid-cols-[1fr_9rem]"]}
    >
      <Field.Label for="requested">
        {byPesos ? "Pesos requested" : "Liters requested"}
      </Field.Label>
      {#if isPriceBased}
        <span class="text-muted-foreground text-sm" id="equivalent-label">
          {byPesos ? "Estimated liters" : "Estimated amount"}
        </span>
      {/if}

      <InputGroup.Root>
        {#if byPesos}
          <InputGroup.Addon>₱</InputGroup.Addon>
          <NumberInput
            id="requested"
            grouped
            bind:value={pesos}
            wholeDigits={6}
            padDecimals
            padWholeSetValues={false}
            required
          />
        {:else}
          <NumberInput
            id="requested"
            grouped
            bind:value={litres}
            wholeDigits={3}
            required
          />
        {/if}
        <InputGroup.Addon align="inline-end">
          {#if isPriceBased}
            <!--
            Only a price-based PO can be asked for in pesos. Liters are asked
            for most of the time, so the choice sits in a menu rather than
            always in view.
          -->
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <InputGroup.Button
                    {...props}
                    variant="ghost"
                    aria-label="Request by: {byPesos ? 'pesos' : 'liters'}"
                    class="pr-1.5! text-xs"
                  >
                    {byPesos ? "Pesos" : "Liters"}
                    <ChevronDownIcon class="size-3" />
                  </InputGroup.Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.RadioGroup
                  value={byPesos ? "pesos" : "liters"}
                  onValueChange={(unit) =>
                    requestIn(unit as "liters" | "pesos")}
                >
                  <DropdownMenu.RadioItem value="liters">
                    Liters
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="pesos">
                    Pesos
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {:else}
            L
          {/if}
        </InputGroup.Addon>
      </InputGroup.Root>

      {#if isPriceBased}
        <output
          for="requested"
          aria-labelledby="equivalent-label"
          aria-describedby="po-balance"
          class={[
            "bg-muted/60 flex h-8 items-center justify-between gap-2 rounded-lg px-2.5 text-sm tabular-nums",
            equivalent === 0 && "text-muted-foreground",
          ]}
        >
          <span class="text-muted-foreground" aria-hidden="true">≈</span>
          <!--
          One NumberFlow for both units, so switching rolls the figure from
          one to the other instead of swapping it.
        -->
          <NumberFlow
            value={equivalent}
            locales={LOCALE}
            format={byPesos ? LITERS_FORMAT : PESO_FORMAT}
            suffix={byPesos ? " L" : ""}
            {...ROLL}
          />
        </output>
      {/if}
    </div>

    {#if error}
      <AnimateContent delay={0}>
        <Field.Error class="pt-1">{error}</Field.Error>
      </AnimateContent>
    {/if}
  </div>
</Field.Field>
