<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import NumberInput from "$lib/components/number-input.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as ButtonGroup from "$lib/components/ui/button-group/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { formatLiters, formatPesos } from "$lib/utils/format-number.js";
  import { fullName } from "@/utils/index.js";
  import {
    getLocalTimeZone,
    today,
    type DateValue,
  } from "@internationalized/date";
  import { toast } from "svelte-sonner";
  import type { PageData } from "./$types";
  import {
    amountInCentavos,
    FUEL_LABELS,
    litersForPesos,
    PO_TYPE_LABELS,
  } from "./purchase-orders/po-math.js";
  import { sampleBalance } from "./sample-withdrawals.js";
  import SearchPicker, { type PickerItem } from "./search-picker.svelte";

  /**
   * The New withdrawal form: what is typed when a withdrawal is requested.
   * The supplier's numbers and the tank lines come later, in the Complete
   * step. Nothing is saved yet, because withdrawals are not stored (MPP-80).
   */
  let {
    open = $bindable(false),
    data,
  }: {
    open: boolean;
    data: Pick<
      PageData,
      "assets" | "employees" | "offices" | "gsuOfficePk" | "usualApproverPk"
    >;
  } = $props();

  const gblCtx = getGlobalContext();
  const me = $derived(gblCtx.user.employee);

  // Only GSU picks whose allocation a withdrawal counts down; everyone else
  // is charged to their own office (point 7 of "Recording a fuel issuance").
  const isGsu = $derived(
    data.gsuOfficePk !== null && me.orgUnitFk === data.gsuOfficePk,
  );
  const myOffice = $derived(
    data.offices.find((o) => o.orgUnitPk === me.orgUnitFk),
  );

  const asItem = (e: PageData["employees"][number]): PickerItem => ({
    value: String(e.employeePk),
    label: fullName(e),
    detail: e.positionTitle,
  });
  const everyone = $derived(data.employees.map(asItem));
  const gsuStaff = $derived(
    data.employees.filter((e) => e.orgUnitFk === data.gsuOfficePk).map(asItem),
  );
  const officeItems = $derived(
    data.offices.map((o) => ({
      value: String(o.orgUnitPk),
      label: o.abbr,
      detail: o.orgUnitName,
      buttonLabel: o.orgUnitName,
      suffix: `(${o.abbr})`,
    })),
  );
  const assetItems = $derived(
    data.assets.map((a) => ({
      value: String(a.assetPk),
      label: `${a.assetName} (${a.plateNumber ?? a.propertyNumber})`,
      detail: `${a.assetTypeName} · ${FUEL_LABELS[a.fuelType]}`,
    })),
  );

  let fileDate = $state<DateValue | undefined>();
  let officePk = $state("");
  let assetPk = $state("");
  let requestBy = $state<"liters" | "pesos">("liters");
  let litres = $state<number | null>(null);
  let pesos = $state<number | null>(null);
  let purpose = $state("");
  let remarks = $state("");
  let driverPk = $state("");
  let destination = $state("");
  let travelFrom = $state<DateValue | undefined>();
  let travelTo = $state<DateValue | undefined>();
  let odometerStart = $state<number | null>(null);
  let wsRequestedBy = $state("");
  let wsApprovedBy = $state("");
  let risApprovedBy = $state("");
  let risIssuedBy = $state("");
  let risReceivedBy = $state("");
  let dttApprovedBy = $state("");

  const asset = $derived(
    data.assets.find((a) => String(a.assetPk) === assetPk),
  );
  // The asset decides whether there is a trip ticket: only a type that reads
  // an odometer travels with a driver ("Which forms apply").
  const hasTripTicket = $derived(asset?.meterType === "odometer");

  const poBalance = $derived.by(() => {
    const office = data.offices.find((o) => String(o.orgUnitPk) === officePk);
    return office && asset ? sampleBalance(office.abbr, asset.fuelType) : null;
  });
  const isPriceBased = $derived(poBalance?.poType === "price");
  // Only a price-based PO can be asked by pesos: its litres are not known
  // until the supplier pumps.
  const byPesos = $derived(isPriceBased && requestBy === "pesos");

  /** What the typed request comes to, at the PO's or the last known price. */
  const requestHint = $derived.by(() => {
    if (!poBalance) return "";
    const price = `${formatPesos(poBalance.priceC)}/L`;
    if (byPesos) {
      if (!pesos) return "";
      const liters = litersForPesos(Math.round(pesos * 100), poBalance.priceC);
      return `≈ ${formatLiters(liters)} at ${price}, the last known price.`;
    }
    if (!litres) return "";
    const amount = formatPesos(
      amountInCentavos(Math.round(litres * 100), poBalance.priceC),
    );
    return isPriceBased
      ? `≈ ${amount} at ${price}, the last known price.`
      : `Amount: ${amount} at ${price}.`;
  });

  /** A GSU line with only one person to offer starts with that person. */
  const onlyGsu = () => (gsuStaff.length === 1 ? gsuStaff[0].value : "");
  const approver = () =>
    data.usualApproverPk === null ? "" : String(data.usualApproverPk);

  // Seeded when the dialog opens, so a half-filled form is not overwritten
  // while it is still up.
  function seed() {
    fileDate = today(getLocalTimeZone());
    officePk = "";
    assetPk = "";
    requestBy = "liters";
    litres = null;
    pesos = null;
    purpose = "";
    remarks = "";
    driverPk = "";
    destination = "";
    travelFrom = undefined;
    travelTo = undefined;
    odometerStart = null;
    wsRequestedBy = String(me.employeePk);
    wsApprovedBy = onlyGsu();
    risApprovedBy = approver();
    risIssuedBy = onlyGsu();
    risReceivedBy = "";
    dttApprovedBy = approver();
  }

  $effect(() => {
    if (open) seed();
  });

  function onsubmit(event: SubmitEvent) {
    event.preventDefault();
    toast.info("Withdrawal not saved", {
      description: "This form is a preview, so nothing is stored yet.",
    });
  }

  const noGsuStaff = $derived(
    data.gsuOfficePk === null
      ? "No General Services Unit is set. An admin sets it on the Signatories page."
      : "Nobody works in the General Services Unit.",
  );
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="flex flex-col sm:max-w-lg ">
    <form
      class="flex min-h-0 max-h-166 flex-col gap-0"
      autocomplete="off"
      {onsubmit}
    >
      <ScrollArea
        class="-mx-4 flex min-h-0 flex-col"
        viewPortClasses="h-auto px-4 pb-4 scroll-fade-y "
        type="auto"
      >
        <Dialog.Header class="mb-4">
          <Dialog.Title>New withdrawal</Dialog.Title>
          <Dialog.Description>
            EMS gives the control, WS, RIS, and DTT numbers when the withdrawal
            is saved.
          </Dialog.Description>
        </Dialog.Header>

        <Field.Group class="gap-6">
          <Field.Set>
            <Field.Legend class="sr-only">Withdrawal slip</Field.Legend>
            <div class="flex gap-2">
              <!-- {#if isGsu} -->
              <Field.Field>
                <Field.Label id="office-label">Office</Field.Label>
                <SearchPicker
                  id="office"
                  aria-labelledby="office-label"
                  items={officeItems}
                  bind:value={officePk}
                  placeholder="Choose the office"
                  searchPlaceholder="Search offices..."
                  required
                />
                <!-- <Field.Description>
                  Whose allocation this withdrawal counts down.
                </Field.Description> -->
              </Field.Field>
              <!-- {/if} -->

              <Field.Field class="w-min">
                <!-- DateInput is labelled by id: a label's `for` cannot reach it. -->
                <Field.Label id="fileDate-label">File date</Field.Label>
                <DateInput
                  id="fileDate"
                  aria-labelledby="fileDate-label"
                  bind:value={fileDate}
                  required
                />
              </Field.Field>
            </div>

            <Field.Field>
              <Field.Label id="asset-label">Asset</Field.Label>
              <SearchPicker
                id="asset"
                aria-labelledby="asset-label"
                items={assetItems}
                bind:value={assetPk}
                placeholder="Choose the asset"
                searchPlaceholder="Search name, plate, or type..."
                empty="No active asset matches."
                required
              />
              <!-- {#if asset}
                <Field.Description>
                  {FUEL_LABELS[asset.fuelType]}.
                  {hasTripTicket
                    ? `A ${asset.assetTypeName.toLowerCase()} travels with a driver, so a trip ticket is included.`
                    : `A ${asset.assetTypeName.toLowerCase()} has no trip ticket.`}
                </Field.Description>
              {/if} -->
            </Field.Field>

            <Field.Field class="">
              <div class="flex items-center justify-between gap-2">
                <Field.Label for="requested">
                  {byPesos ? "Pesos requested" : "Liters requested"}
                </Field.Label>
                {#if isPriceBased}
                  <ButtonGroup.Root aria-label="Request by">
                    <Button
                      size="xs"
                      variant={byPesos ? "outline" : "secondary"}
                      aria-pressed={!byPesos}
                      onclick={() => (requestBy = "liters")}
                    >
                      Liters
                    </Button>
                    <Button
                      size="xs"
                      variant={byPesos ? "secondary" : "outline"}
                      aria-pressed={byPesos}
                      onclick={() => (requestBy = "pesos")}
                    >
                      Pesos
                    </Button>
                  </ButtonGroup.Root>
                {/if}
              </div>

              {#if byPesos}
                <InputGroup.Root>
                  <InputGroup.Addon>₱</InputGroup.Addon>
                  <NumberInput
                    id="requested"
                    grouped
                    bind:value={pesos}
                    wholeDigits={6}
                    padDecimals
                    required
                  />
                  {#if poBalance && poBalance.balanceC > 0}
                    <InputGroup.Addon align="inline-end">
                      <InputGroup.Button
                        size="xs"
                        onclick={() => (pesos = poBalance.balanceC / 100)}
                      >
                        Use the rest
                      </InputGroup.Button>
                    </InputGroup.Addon>
                  {/if}
                </InputGroup.Root>
              {:else}
                <InputGroup.Root>
                  <NumberInput
                    id="requested"
                    grouped
                    bind:value={litres}
                    wholeDigits={3}
                    required
                  />
                  <InputGroup.Addon align="inline-end">L</InputGroup.Addon>
                </InputGroup.Root>
              {/if}

              {#if poBalance}
                <Field.Description>
                  {poBalance.poNumber} is {PO_TYPE_LABELS[poBalance.poType]}.
                  Balance:
                  {isPriceBased
                    ? `${formatPesos(poBalance.balanceC)} (≈ ${formatLiters(poBalance.balanceH)})`
                    : `${formatLiters(poBalance.balanceH)} (${formatPesos(poBalance.balanceC)})`}
                  {#if requestHint}
                    <br />{requestHint}
                  {/if}
                </Field.Description>
              {/if}
            </Field.Field>

            <Field.Field>
              <Field.Label for="purpose">Purpose</Field.Label>
              <Textarea
                id="purpose"
                bind:value={purpose}
                maxlength={500}
                rows={2}
                required
              />
              <!-- <Field.Description>
                Printed on the RIS{hasTripTicket ? " and the trip ticket" : ""}.
              </Field.Description> -->
            </Field.Field>

            <Field.Field>
              <Field.Label for="remarks">
                Remarks
                <span class="font-normal text-muted-foreground">(optional)</span
                >
              </Field.Label>
              <Textarea id="remarks" bind:value={remarks} maxlength={200} />
            </Field.Field>
          </Field.Set>

          {#if hasTripTicket}
            <!-- <Field.Separator /> -->
            <Field.Set>
              <Field.Legend
                class="text-muted-foreground gap-2 min-h-4 text-left relative flex w-full items-center after:h-px after:min-w-0 after:flex-1 after:bg-border after:ml-1"
                >Travel information</Field.Legend
              >
              <!-- <div
                class="gap-2 text-sm text-muted-foreground min-h-4 text-left relative flex w-full items-center after:h-px after:min-w-0 after:flex-1 after:bg-border after:ml-1"
              >
                <span data-slot="marker-content" class="min-w-0 wrap-break-word"
                  >Travel information</span
                >
              </div> -->

              <div class="grid gap-4">
                <Field.Field>
                  <Field.Label id="driver-label">Driver</Field.Label>
                  <SearchPicker
                    id="driver"
                    aria-labelledby="driver-label"
                    items={everyone}
                    bind:value={driverPk}
                    placeholder="Choose the driver"
                    searchPlaceholder="Search employees..."
                    required
                  />
                </Field.Field>

                <Field.Field>
                  <Field.Label for="destination">Destination</Field.Label>
                  <Input
                    id="destination"
                    bind:value={destination}
                    maxlength={200}
                    required
                  />
                </Field.Field>

                <Field.Field>
                  <Field.Label id="travelFrom-label">Travel from</Field.Label>
                  <DateInput
                    id="travelFrom"
                    aria-labelledby="travelFrom-label"
                    bind:value={travelFrom}
                    required
                  />
                </Field.Field>

                <Field.Field>
                  <Field.Label id="travelTo-label">Travel to</Field.Label>
                  <!-- The browser refuses a return before the start and names the date. -->
                  <DateInput
                    id="travelTo"
                    aria-labelledby="travelTo-label"
                    bind:value={travelTo}
                    minValue={travelFrom}
                    required
                  />
                </Field.Field>

                <Field.Field>
                  <Field.Label for="odometerStart">
                    Odometer reading at the start
                    <span class="font-normal text-muted-foreground">
                      (if any)
                    </span>
                  </Field.Label>
                  <InputGroup.Root>
                    <NumberInput
                      id="odometerStart"
                      grouped
                      bind:value={odometerStart}
                      wholeDigits={7}
                      decimals={0}
                    />
                    <InputGroup.Addon align="inline-end">km</InputGroup.Addon>
                  </InputGroup.Root>
                </Field.Field>
              </div>
            </Field.Set>
          {/if}

          <Field.Separator />
          <Field.Set>
            <Field.Legend>Signatories</Field.Legend>

            <p class="text-sm font-medium text-muted-foreground">
              Withdrawal slip
            </p>
            <div class="grid gap-4">
              <Field.Field>
                <Field.Label id="wsRequestedBy-label">
                  Requested by (Section Incharge)
                </Field.Label>
                <SearchPicker
                  id="wsRequestedBy"
                  aria-labelledby="wsRequestedBy-label"
                  items={everyone}
                  bind:value={wsRequestedBy}
                  searchPlaceholder="Search employees..."
                  required
                />
              </Field.Field>
              <Field.Field>
                <Field.Label id="wsApprovedBy-label">
                  Approved by (GSU Representative)
                </Field.Label>
                <SearchPicker
                  id="wsApprovedBy"
                  aria-labelledby="wsApprovedBy-label"
                  items={gsuStaff}
                  bind:value={wsApprovedBy}
                  placeholder="Choose GSU staff"
                  searchPlaceholder="Search GSU staff..."
                  empty={noGsuStaff}
                  required
                />
              </Field.Field>
            </div>

            <p class="text-sm font-medium text-muted-foreground">RIS</p>
            <div class="grid gap-4">
              <Field.Field>
                <Field.Label>Requested by</Field.Label>
                <p class="flex h-8 items-center text-sm">{fullName(me)}</p>
                <Field.Description>
                  Always the person who enters the withdrawal.
                </Field.Description>
              </Field.Field>
              <Field.Field>
                <Field.Label id="risApprovedBy-label">Approved by</Field.Label>
                <SearchPicker
                  id="risApprovedBy"
                  aria-labelledby="risApprovedBy-label"
                  items={everyone}
                  bind:value={risApprovedBy}
                  placeholder="Choose the approver"
                  searchPlaceholder="Search employees..."
                  required
                />
              </Field.Field>
              <Field.Field>
                <Field.Label id="risIssuedBy-label">Issued by</Field.Label>
                <SearchPicker
                  id="risIssuedBy"
                  aria-labelledby="risIssuedBy-label"
                  items={gsuStaff}
                  bind:value={risIssuedBy}
                  placeholder="Choose GSU staff"
                  searchPlaceholder="Search GSU staff..."
                  empty={noGsuStaff}
                  required
                />
              </Field.Field>
              <Field.Field>
                <Field.Label id="risReceivedBy-label">
                  Received by
                  <span class="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Field.Label>
                <SearchPicker
                  id="risReceivedBy"
                  aria-labelledby="risReceivedBy-label"
                  items={everyone}
                  bind:value={risReceivedBy}
                  placeholder="Left for writing by hand"
                  searchPlaceholder="Search employees..."
                />
              </Field.Field>
            </div>

            {#if hasTripTicket}
              <p class="text-sm font-medium text-muted-foreground">
                Trip ticket
              </p>
              <div class="grid gap-4">
                <Field.Field>
                  <Field.Label id="dttApprovedBy-label">Approved by</Field.Label
                  >
                  <SearchPicker
                    id="dttApprovedBy"
                    aria-labelledby="dttApprovedBy-label"
                    items={everyone}
                    bind:value={dttApprovedBy}
                    placeholder="Choose the approver"
                    searchPlaceholder="Search employees..."
                    required
                  />
                </Field.Field>
              </div>
            {/if}
          </Field.Set>
        </Field.Group>
      </ScrollArea>

      <Dialog.Footer class="items-center">
        <p class="mr-auto text-xs text-muted-foreground">
          A preview: saving is not built yet.
        </p>
        <Button type="button" variant="outline" onclick={() => (open = false)}>
          Cancel
        </Button>
        <Button type="submit">Save withdrawal</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
