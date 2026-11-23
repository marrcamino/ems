<script lang="ts">
  import DateInput from "$lib/components/date-input.svelte";
  import * as Field from "$lib/components/ui/field/index.js";
  import { getGlobalContext } from "$routes/global-context.svelte";
  import { getLocalTimeZone, today } from "@internationalized/date";
  import type { WithdrawalForm } from "./new-withdrawal-form.svelte.js";
  import SearchPicker from "./search-picker.svelte";

  /**
   * The office, the file date, and the asset, which every transaction
   * starts with, on the first step of its form. A trip, with or without a
   * reimbursement, offers only the assets with a trip ticket.
   */
  let { form }: { form: WithdrawalForm } = $props();

  const gblCtx = getGlobalContext();
  const errors = $derived(form.errors);
  const isTrip = $derived(form.kind !== "withdrawal");
</script>

<div class="flex gap-2">
  <Field.Field data-invalid={errors.officePk ? true : undefined}>
    <Field.Label id="officePk-label" required>Office</Field.Label>
    <!--
      Only someone who sees every office picks one; everyone else sees their
      own office, fixed (point 7 of "Recording a fuel issuance"). The server
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

  <Field.Field class="w-min" data-invalid={errors.fileDate ? true : undefined}>
    <!--
      DateInput is labelled by id: a label's `for` cannot reach it. An edit
      keeps the file date, since the numbers carry its year and month.
    -->
    <Field.Label id="fileDate-label" required>File date</Field.Label>
    <DateInput
      id="fileDate"
      aria-labelledby="fileDate-label"
      bind:value={form.fileDate}
      maxValue={today(getLocalTimeZone())}
      disabled={!!form.editing || !gblCtx.can("fuel:change_file_date")}
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
    items={isTrip ? form.tripAssetItems : form.assetItems}
    bind:value={form.assetPk}
    placeholder="Choose the asset"
    searchPlaceholder="Search name, plate, or type..."
    empty={isTrip
      ? "No active asset with a trip ticket matches."
      : "No active asset matches."}
    required
  />
  <Field.Error>{errors.assetPk}</Field.Error>
</Field.Field>
