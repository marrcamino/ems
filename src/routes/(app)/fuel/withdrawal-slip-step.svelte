<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import AnimateContent from "$lib/components/transition/animate-content.svelte";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import { LEGEND, type WithdrawalForm } from "./new-withdrawal-form.svelte.js";
  import { FUEL_LABELS } from "./purchase-orders/po-math.js";
  import RequestField from "./request-field.svelte";
  import SearchPicker from "./search-picker.svelte";
  import { leftOn } from "./withdrawal-row.js";

  /** The first step of the New withdrawal form: the fuel, the PO, and the slip's people. */
  let { form }: { form: WithdrawalForm } = $props();

  const gblCtx = getGlobalContext();
  const errors = $derived(form.errors);

  const poPlaceholder = $derived.by(() => {
    if (!form.office && !form.asset)
      return "Choose the office and the asset first";
    if (!form.office) return "Choose the office first";
    if (!form.asset) return "Choose the asset first";
    if (form.noBalance) return "No PO has this fuel for this office";
    return "Choose the PO";
  });
</script>

<Field.Group class="gap-6">
  <Field.Set>
    <Field.Legend class="sr-only">The fuel and the PO</Field.Legend>
    <div class="flex gap-2">
      <Field.Field data-invalid={errors.officePk ? true : undefined}>
        <Field.Label id="officePk-label" required>Office</Field.Label>
        <!--
          Only someone who sees every office picks whose allocation a
          withdrawal counts down; everyone else sees their own office,
          fixed (point 7 of "Recording a fuel issuance"). The server
          decides it the same way.
        -->
        <SearchPicker
          id="officePk"
          aria-labelledby="officePk-label"
          items={form.officeItems}
          bind:value={form.officePk}
          placeholder={form.data.allOffices ? "Choose the office" : "No office"}
          searchPlaceholder="Search offices..."
          disabled={!form.data.allOffices}
          required
        />
        <Field.Error>{errors.officePk}</Field.Error>
      </Field.Field>

      <Field.Field
        class="w-min"
        data-invalid={errors.fileDate ? true : undefined}
      >
        <!-- DateInput is labelled by id: a label's `for` cannot reach it. -->
        <Field.Label id="fileDate-label" required>File date</Field.Label>
        <DateInput
          id="fileDate"
          aria-labelledby="fileDate-label"
          bind:value={form.fileDate}
          maxValue={today(getLocalTimeZone())}
          disabled={!gblCtx.can("fuel:change_file_date")}
          required
        />
        <Field.Error>{errors.fileDate}</Field.Error>
      </Field.Field>
    </div>

    <Field.Field data-invalid={errors.assetPk ? true : undefined}>
      <Field.Label id="assetPk-label" required>Asset</Field.Label>
      <SearchPicker
        id="assetPk"
        aria-labelledby="assetPk-label"
        items={form.assetItems}
        bind:value={form.assetPk}
        placeholder="Choose the asset"
        searchPlaceholder="Search name, plate, or type..."
        empty="No active asset matches."
        required
      />
      <Field.Error>{errors.assetPk}</Field.Error>
    </Field.Field>

    {@const poInvalid = form.poError || errors.purchaseOrderPk}
    <Field.Field class="gap-0" data-invalid={poInvalid ? true : undefined}>
      <Field.Label for="purchaseOrderPk" required>PO</Field.Label>
      <Select.Root
        type="single"
        disabled={form.poOptions.length === 0}
        bind:value={form.purchaseOrderPk}
        onValueChange={() => delete form.errors.purchaseOrderPk}
      >
        <Select.Trigger
          id="purchaseOrderPk"
          class="mt-1 w-full"
          aria-invalid={poInvalid ? true : undefined}
        >
          {#if form.poBalance}
            PO {form.poBalance.poNumber}
          {:else}
            <span class="text-muted-foreground">{poPlaceholder}</span>
          {/if}
        </Select.Trigger>
        <Select.Content>
          {#each form.poOptions as b (b.purchaseOrderPk)}
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
      {:else if form.noBalance && form.office && form.asset}
        {@const fuel = FUEL_LABELS[form.asset.fuelType].toLowerCase()}
        {@const abbr = form.office.abbr}
        <AnimateContent innerDelay={150} outerDelay={150}>
          <div class="pt-1">
            <Alert.Root variant="warning">
              <TriangleAlertIcon />
              <Alert.Title>No {fuel} left for {abbr}</Alert.Title>
              <Alert.Description>
                A PO with a {fuel} allocation for {abbr} is needed before this withdrawal
                can be saved.
              </Alert.Description>
            </Alert.Root>
          </div>
        </AnimateContent>
      {/if}
    </Field.Field>

    <RequestField
      poBalance={form.poBalance}
      bind:requestBy={form.requestBy}
      bind:litres={form.litres}
      bind:pesos={form.pesos}
      error={form.requestError || errors.requested}
    />

    <Field.Field data-invalid={errors.wsWithdrawnBy ? true : undefined}>
      <Field.Label id="wsWithdrawnBy-label" required>Withdrawn by</Field.Label>
      <SearchPicker
        id="wsWithdrawnBy"
        aria-labelledby="wsWithdrawnBy-label"
        items={form.everyone}
        allowTyped
        bind:value={form.wsWithdrawnBy}
        bind:typed={form.wsWithdrawnByName}
        placeholder="Choose a name"
        searchPlaceholder="Search or type a name..."
        required
      />
      <Field.Error>{errors.wsWithdrawnBy}</Field.Error>
    </Field.Field>
  </Field.Set>

  <Field.Set>
    <Field.Legend class={LEGEND}>Signatories</Field.Legend>
    <Field.Field data-invalid={errors.wsRequestedBy ? true : undefined}>
      <Field.Label id="wsRequestedBy-label" required note="Section Incharge"
        >Requested by</Field.Label
      >
      <SearchPicker
        id="wsRequestedBy"
        aria-labelledby="wsRequestedBy-label"
        items={form.everyone}
        bind:value={form.wsRequestedBy}
        searchPlaceholder="Search employees..."
        required
      />
      <Field.Error>{errors.wsRequestedBy}</Field.Error>
    </Field.Field>
    <Field.Field data-invalid={errors.wsApprovedBy ? true : undefined}>
      <Field.Label id="wsApprovedBy-label" required note="GSU Representative"
        >Approved by</Field.Label
      >
      <SearchPicker
        id="wsApprovedBy"
        aria-labelledby="wsApprovedBy-label"
        items={form.gsuStaff}
        bind:value={form.wsApprovedBy}
        placeholder="Choose GSU staff"
        searchPlaceholder="Search GSU staff..."
        empty={form.noGsuStaff}
        required
      />
      <Field.Error>{errors.wsApprovedBy}</Field.Error>
    </Field.Field>
  </Field.Set>
</Field.Group>
