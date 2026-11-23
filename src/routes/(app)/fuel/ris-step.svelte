<script lang="ts">
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { LEGEND, type WithdrawalForm } from "./new-withdrawal-form.svelte.js";
  import SearchPicker from "./search-picker.svelte";

  /** The second step of the New withdrawal form: the RIS. */
  let { form }: { form: WithdrawalForm } = $props();

  const errors = $derived(form.errors);
</script>

<Field.Group class="gap-6">
  <Field.Set>
    <Field.Legend class="sr-only">The RIS</Field.Legend>
    <!-- Rarely filled in, but the RIS has a box for each. -->
    <div class="grid gap-4 sm:grid-cols-2">
      <Field.Field data-invalid={errors.risFundCluster ? true : undefined}>
        <Field.Label for="risFundCluster">Fund cluster</Field.Label>
        <Input
          id="risFundCluster"
          bind:value={form.risFundCluster}
          maxlength={50}
        />
        <Field.Error>{errors.risFundCluster}</Field.Error>
      </Field.Field>

      <Field.Field
        data-invalid={errors.risResponsibilityCenterCode ? true : undefined}
      >
        <Field.Label for="risResponsibilityCenterCode"
          >Responsibility center code</Field.Label
        >
        <Input
          id="risResponsibilityCenterCode"
          bind:value={form.risResponsibilityCenterCode}
          maxlength={50}
        />
        <Field.Error>{errors.risResponsibilityCenterCode}</Field.Error>
      </Field.Field>
    </div>

    <Field.Field data-invalid={errors.risStockNumber ? true : undefined}>
      <Field.Label for="risStockNumber">Stock number</Field.Label>
      <Input
        id="risStockNumber"
        bind:value={form.risStockNumber}
        maxlength={50}
      />
      <Field.Error>{errors.risStockNumber}</Field.Error>
    </Field.Field>

    <Field.Field data-invalid={errors.risRemarks ? true : undefined}>
      <Field.Label for="risRemarks">Remarks</Field.Label>
      <Textarea id="risRemarks" bind:value={form.risRemarks} maxlength={200} />
      <Field.Error>{errors.risRemarks}</Field.Error>
    </Field.Field>

    <Field.Field data-invalid={errors.risPurpose ? true : undefined}>
      <Field.Label for="risPurpose">Purpose</Field.Label>
      <Textarea
        id="risPurpose"
        value={form.risPurpose}
        oninput={(e) => form.typePurpose("ris", e.currentTarget.value)}
        onblur={() => form.leavePurpose("ris")}
        maxlength={500}
        rows={2}
      />
      <Field.Error>{errors.risPurpose}</Field.Error>
    </Field.Field>
  </Field.Set>

  <Field.Set>
    <Field.Legend class={LEGEND}>Signatories</Field.Legend>
    <Field.Field data-invalid={errors.risRequestedBy ? true : undefined}>
      <Field.Label id="risRequestedBy-label" required>Requested by</Field.Label>
      <SearchPicker
        id="risRequestedBy"
        aria-labelledby="risRequestedBy-label"
        items={form.everyone}
        bind:value={form.risRequestedBy}
        searchPlaceholder="Search employees..."
        required
      />
      <Field.Error>{errors.risRequestedBy}</Field.Error>
    </Field.Field>
    <Field.Field data-invalid={errors.risApprovedBy ? true : undefined}>
      <Field.Label id="risApprovedBy-label" required>Approved by</Field.Label>
      <SearchPicker
        id="risApprovedBy"
        aria-labelledby="risApprovedBy-label"
        items={form.everyone}
        bind:value={form.risApprovedBy}
        placeholder="Choose the approver"
        searchPlaceholder="Search employees..."
        required
      />
      <Field.Error>{errors.risApprovedBy}</Field.Error>
    </Field.Field>
    <Field.Field data-invalid={errors.risIssuedBy ? true : undefined}>
      <Field.Label id="risIssuedBy-label" note="GSU staff" required
        >Issued by</Field.Label
      >
      <SearchPicker
        id="risIssuedBy"
        aria-labelledby="risIssuedBy-label"
        items={form.gsuStaff}
        bind:value={form.risIssuedBy}
        placeholder="Choose GSU staff"
        searchPlaceholder="Search GSU staff..."
        empty={form.noGsuStaff}
        required
      />
      <Field.Error>{errors.risIssuedBy}</Field.Error>
    </Field.Field>
    <Field.Field>
      <Field.Label id="risReceivedBy-label">Received by</Field.Label>
      <SearchPicker
        id="risReceivedBy"
        aria-labelledby="risReceivedBy-label"
        items={form.everyone}
        bind:value={form.risReceivedBy}
        placeholder="Choose a receiver"
        searchPlaceholder="Search employees..."
      />
    </Field.Field>
  </Field.Set>
</Field.Group>
