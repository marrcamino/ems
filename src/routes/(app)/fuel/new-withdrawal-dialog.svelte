<script lang="ts">
  import { enhance } from "$app/forms";
  import DateInput from "$lib/components/date-input.svelte";
  import NumberInput from "$lib/components/number-input.svelte";
  import AnimateContent from "$lib/components/transition/animate-content.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import HiddenInput from "$lib/components/ui/hidden-input.svelte";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { fullName } from "@/utils/index.js";
  import {
    getLocalTimeZone,
    today,
    type DateValue,
  } from "@internationalized/date";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import { toast } from "svelte-sonner";
  import type { PageData } from "./$types";
  import { FUEL_LABELS } from "./purchase-orders/po-math.js";
  import RequestField from "./request-field.svelte";
  import SearchPicker, { type PickerItem } from "./search-picker.svelte";
  import {
    leftOn,
    oldestPoFirstMessage,
    overBalanceMessage,
  } from "./withdrawal-row.js";

  /**
   * The New withdrawal form: what is typed when a withdrawal is requested.
   * The supplier's numbers and the tank lines come later, in the Complete
   * step. Saving gives the control, WS, RIS, and DTT numbers, and the list
   * reloads with the new row.
   */
  let {
    open = $bindable(false),
    data,
  }: {
    open: boolean;
    data: Pick<
      PageData,
      | "assets"
      | "employees"
      | "offices"
      | "gsuOfficePk"
      | "usualApproverPk"
      | "poBalances"
      | "allOffices"
    >;
  } = $props();

  const gblCtx = getGlobalContext();
  const me = $derived(gblCtx.user.employee);

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
  // The button reads name, type, then plate; the list drops the type into a
  // badge. Names repeat (Topic 2 of fuel-assets.md), so
  // two assets with the same name and no plate add their property number,
  // or they would read the same. It is always searchable.
  const assetItems = $derived.by(() => {
    const nameKey = (name: string) => name.trim().toLowerCase();
    const unplated = new Map<string, number>();
    for (const a of data.assets) {
      if (a.plateNumber) continue;
      const key = nameKey(a.assetName);
      unplated.set(key, (unplated.get(key) ?? 0) + 1);
    }
    return data.assets.map((a): PickerItem => {
      const sameName = (unplated.get(nameKey(a.assetName)) ?? 0) > 1;
      const tag = a.plateNumber ?? (sameName ? `PN ${a.propertyNumber}` : null);
      return {
        value: String(a.assetPk),
        label: [a.assetName, tag].filter(Boolean).join(" · "),
        buttonLabel: [a.assetName, a.assetTypeName, tag]
          .filter(Boolean)
          .join(" · "),
        badge: a.assetTypeName,
        keywords: [a.propertyNumber],
      };
    });
  });

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
  // The asset decides whether there is a trip ticket ("Trip ticket belongs to
  // the asset" in fuel-assets.md).
  const hasTripTicket = $derived(asset?.hasTripTicket ?? false);

  const office = $derived(
    data.offices.find((o) => String(o.orgUnitPk) === officePk),
  );
  // Every PO where the office still has this fuel, oldest first. The oldest
  // is filled in again whenever the office or the asset changes. A newer one
  // can be picked, but it is refused: the oldest is used up first (point 4
  // of "How POs and withdrawal slips work").
  const poOptions = $derived(
    office && asset
      ? data.poBalances.filter(
          (b) => b.orgUnitPk === office.orgUnitPk && b.fuel === asset.fuelType,
        )
      : [],
  );
  let purchaseOrderPk = $derived(
    poOptions.length > 0 ? String(poOptions[0].purchaseOrderPk) : "",
  );
  const poBalance = $derived(
    poOptions.find((b) => String(b.purchaseOrderPk) === purchaseOrderPk) ??
      null,
  );
  const poError = $derived(
    office && poBalance && poBalance !== poOptions[0]
      ? oldestPoFirstMessage(poOptions[0], office.abbr)
      : "",
  );
  // Picked, but nothing left of that fuel on any PO, so the server refuses.
  const noBalance = $derived(!!office && !!asset && poOptions.length === 0);
  const poPlaceholder = $derived.by(() => {
    if (!office && !asset) return "Choose the office and the asset first";
    if (!office) return "Choose the office first";
    if (!asset) return "Choose the asset first";
    if (noBalance) return "No PO has this fuel for this office";
    return "Choose the PO";
  });
  const isPriceBased = $derived(poBalance?.poType === "price");
  // Only a price-based PO can be asked by pesos: its litres are not known
  // until the supplier pumps.
  const byPesos = $derived(isPriceBased && requestBy === "pesos");
  // The server refuses the same request with the same words.
  const requestError = $derived(
    poBalance
      ? (overBalanceMessage(poBalance, {
          requestedH: byPesos ? null : Math.round((litres ?? 0) * 100),
          requestedC: byPesos ? Math.round((pesos ?? 0) * 100) : null,
        }) ?? "")
      : "",
  );

  /** A GSU line with only one person to offer starts with that person. */
  const onlyGsu = () => (gsuStaff.length === 1 ? gsuStaff[0].value : "");
  const approver = () =>
    data.usualApproverPk === null ? "" : String(data.usualApproverPk);

  // Seeded again once the dialog has finished closing, so the next open
  // starts clean instead of showing the last form (and its warning) for a
  // moment. Also when it opens, so the file date is today's.
  function seed() {
    fileDate = today(getLocalTimeZone());
    officePk = String(me.orgUnitFk ?? "");
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
    errors = {};
  }

  $effect(() => {
    if (open) seed();
  });

  /** The server's refusals, by field, shown under the field. */
  let errors = $state<Record<string, string>>({});
  let submitting = $state(false);

  const payload = $derived(
    JSON.stringify({
      fileDate: fileDate?.toString() ?? "",
      officePk,
      assetPk,
      purchaseOrderPk,
      requestBy: byPesos ? "pesos" : "liters",
      liters: byPesos ? null : litres,
      pesos: byPesos ? pesos : null,
      purpose,
      remarks,
      driverPk,
      destination,
      travelFrom: travelFrom?.toString() ?? "",
      travelTo: travelTo?.toString() ?? "",
      odometerStart,
      wsRequestedBy,
      wsApprovedBy,
      risApprovedBy,
      risIssuedBy,
      risReceivedBy,
      dttApprovedBy,
    }),
  );

  const noGsuStaff = $derived(
    data.gsuOfficePk === null
      ? "No General Services Unit is set. An admin sets it on the Signatories page."
      : "Nobody works in the General Services Unit.",
  );
</script>

<Dialog.Root
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) seed();
  }}
>
  <Dialog.Content class="flex flex-col sm:max-w-lg ">
    <form
      class="flex min-h-0 max-h-166 flex-col gap-0"
      method="POST"
      action="?/createWithdrawal"
      autocomplete="off"
      use:enhance={() => {
        errors = {};
        submitting = true;
        return async ({ result, update }) => {
          submitting = false;
          if (result.type === "success") {
            await update();
            open = false;
            toast.success("Withdrawal saved", {
              description: `Its control number is ${result.data?.controlNumber}.`,
            });
            return;
          }
          if (result.type === "failure") {
            const refusal = result.data as
              { error?: string; field?: string } | undefined;
            if (refusal?.field && refusal.error) {
              errors = { [refusal.field]: refusal.error };
              document
                .getElementById(refusal.field)
                ?.scrollIntoView({ block: "center" });
              return;
            }
            toast.error("Withdrawal not saved", {
              description: refusal?.error ?? "Try again.",
            });
            return;
          }
          toast.error("Withdrawal not saved", {
            description: "Try again. If it keeps happening, contact ICT.",
          });
        };
      }}
    >
      <HiddenInput name="payload" value={payload} />
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
              <Field.Field data-invalid={errors.officePk ? true : undefined}>
                <Field.Label id="officePk-label">Office</Field.Label>
                <!--
                  Only someone who sees every office picks whose allocation a
                  withdrawal counts down; everyone else sees their own office,
                  fixed (point 7 of "Recording a fuel issuance"). The server
                  decides it the same way.
                -->
                <SearchPicker
                  id="officePk"
                  aria-labelledby="officePk-label"
                  items={officeItems}
                  bind:value={officePk}
                  placeholder={data.allOffices
                    ? "Choose the office"
                    : "No office"}
                  searchPlaceholder="Search offices..."
                  disabled={!data.allOffices}
                  required
                />
                <!-- <Field.Description>
                  Whose allocation this withdrawal counts down.
                </Field.Description> -->
                <Field.Error>{errors.officePk}</Field.Error>
              </Field.Field>

              <Field.Field
                class="w-min"
                data-invalid={errors.fileDate ? true : undefined}
              >
                <!-- DateInput is labelled by id: a label's `for` cannot reach it. -->
                <Field.Label id="fileDate-label">File date</Field.Label>
                <DateInput
                  id="fileDate"
                  aria-labelledby="fileDate-label"
                  bind:value={fileDate}
                  maxValue={today(getLocalTimeZone())}
                  disabled={!gblCtx.can("fuel:change_file_date")}
                  required
                />
                <Field.Error>{errors.fileDate}</Field.Error>
              </Field.Field>
            </div>

            <Field.Field data-invalid={errors.assetPk ? true : undefined}>
              <Field.Label id="assetPk-label">Asset</Field.Label>
              <SearchPicker
                id="assetPk"
                aria-labelledby="assetPk-label"
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
              <Field.Error>{errors.assetPk}</Field.Error>
            </Field.Field>

            {@const poInvalid = poError || errors.purchaseOrderPk}
            <Field.Field
              class="gap-0"
              data-invalid={poInvalid ? true : undefined}
            >
              <Field.Label for="purchaseOrderPk">PO</Field.Label>
              <Select.Root
                type="single"
                disabled={poOptions.length === 0}
                bind:value={purchaseOrderPk}
                onValueChange={() => delete errors.purchaseOrderPk}
              >
                <Select.Trigger
                  id="purchaseOrderPk"
                  class="w-full mt-1"
                  aria-invalid={poInvalid ? true : undefined}
                >
                  {#if poBalance}
                    PO {poBalance.poNumber}
                  {:else}
                    <span class="text-muted-foreground">{poPlaceholder}</span>
                  {/if}
                </Select.Trigger>
                <Select.Content>
                  {#each poOptions as b (b.purchaseOrderPk)}
                    <Select.Item
                      value={String(b.purchaseOrderPk)}
                      label="PO {b.poNumber}"
                    >
                      <span class="grid">
                        <span>PO {b.poNumber}</span>
                        <span class="text-muted-foreground text-xs">
                          {b.supplierName} · {leftOn(b)} left
                        </span>
                      </span>
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              {#if poInvalid}
                <Field.Error>{poInvalid}</Field.Error>
              {:else if noBalance && office && asset}
                {@const fuel = FUEL_LABELS[asset.fuelType].toLowerCase()}

                <AnimateContent innerDelay={150} outerDelay={150}>
                  <div class="pt-1">
                    <Alert.Root variant="warning">
                      <TriangleAlertIcon />
                      <Alert.Title>No {fuel} left for {office.abbr}</Alert.Title
                      >
                      <Alert.Description>
                        A PO with a {fuel} allocation for {office.abbr} is needed
                        before this withdrawal can be saved.
                      </Alert.Description>
                    </Alert.Root>
                  </div>
                </AnimateContent>
              {/if}
            </Field.Field>

            <RequestField
              {poBalance}
              bind:requestBy
              bind:litres
              bind:pesos
              error={requestError || errors.requested}
            />

            <Field.Field data-invalid={errors.purpose ? true : undefined}>
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
              <Field.Error>{errors.purpose}</Field.Error>
            </Field.Field>

            <Field.Field>
              <Field.Label for="remarks">
                Remarks
                <span class="font-normal text-muted-foreground">(optional)</span
                >
              </Field.Label>
              <Textarea id="remarks" bind:value={remarks} maxlength={200} />
              <Field.Error>{errors.remarks}</Field.Error>
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
                <Field.Field data-invalid={errors.driverPk ? true : undefined}>
                  <Field.Label id="driverPk-label">Driver</Field.Label>
                  <SearchPicker
                    id="driverPk"
                    aria-labelledby="driverPk-label"
                    items={everyone}
                    bind:value={driverPk}
                    placeholder="Choose the driver"
                    searchPlaceholder="Search employees..."
                    required
                  />
                  <Field.Error>{errors.driverPk}</Field.Error>
                </Field.Field>

                <Field.Field
                  data-invalid={errors.destination ? true : undefined}
                >
                  <Field.Label for="destination">Destination</Field.Label>
                  <Input
                    id="destination"
                    bind:value={destination}
                    maxlength={200}
                    required
                  />
                  <Field.Error>{errors.destination}</Field.Error>
                </Field.Field>

                <Field.Field
                  data-invalid={errors.travelFrom ? true : undefined}
                >
                  <Field.Label id="travelFrom-label">Travel from</Field.Label>
                  <DateInput
                    id="travelFrom"
                    aria-labelledby="travelFrom-label"
                    bind:value={travelFrom}
                    required
                  />
                  <Field.Error>{errors.travelFrom}</Field.Error>
                </Field.Field>

                <Field.Field data-invalid={errors.travelTo ? true : undefined}>
                  <Field.Label id="travelTo-label">Travel to</Field.Label>
                  <!-- The browser refuses a return before the start and names the date. -->
                  <DateInput
                    id="travelTo"
                    aria-labelledby="travelTo-label"
                    bind:value={travelTo}
                    minValue={travelFrom}
                    required
                  />
                  <Field.Error>{errors.travelTo}</Field.Error>
                </Field.Field>

                <Field.Field
                  data-invalid={errors.odometerStart ? true : undefined}
                >
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
                  <Field.Error>{errors.odometerStart}</Field.Error>
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
              <Field.Field
                data-invalid={errors.wsRequestedBy ? true : undefined}
              >
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
                <Field.Error>{errors.wsRequestedBy}</Field.Error>
              </Field.Field>
              <Field.Field
                data-invalid={errors.wsApprovedBy ? true : undefined}
              >
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
                <Field.Error>{errors.wsApprovedBy}</Field.Error>
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
              <Field.Field
                data-invalid={errors.risApprovedBy ? true : undefined}
              >
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
                <Field.Error>{errors.risApprovedBy}</Field.Error>
              </Field.Field>
              <Field.Field data-invalid={errors.risIssuedBy ? true : undefined}>
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
                <Field.Error>{errors.risIssuedBy}</Field.Error>
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
                <Field.Field
                  data-invalid={errors.dttApprovedBy ? true : undefined}
                >
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
                  <Field.Error>{errors.dttApprovedBy}</Field.Error>
                </Field.Field>
              </div>
            {/if}
          </Field.Set>
        </Field.Group>
      </ScrollArea>

      <Dialog.Footer class="items-center">
        <Button type="button" variant="outline" onclick={() => (open = false)}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || !!poError || !!requestError}
        >
          {submitting ? "Saving..." : "Save withdrawal"}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
