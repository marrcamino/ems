<script lang="ts">
  import * as DialogViews from "$lib/components/dialog-views/index.js";
  import * as Stepper from "$lib/components/stepper/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import type { Supplier } from "@/types";
  import { cn } from "cn";
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { AddPurchaseOrderForm, DETAIL_FIELDS } from "./add-po-form.svelte.js";
  import PoAllocationStep from "./po-allocation-step.svelte";
  import PoDetailsStep from "./po-details-step.svelte";
  import { FUELS } from "./po-math.js";
  import type { PurchaseOrderRow, UnitOption } from "./po-types.js";

  let {
    open = $bindable(false),
    suppliers,
    unitOptions,
    onSaved,
    onManageSuppliers,
  }: {
    open: boolean;
    /** Active suppliers only: a new PO cannot name an archived one. */
    suppliers: Supplier[];
    /** The active divisions, sections, units and offices, in level order. */
    unitOptions: UnitOption[];
    onSaved: (row: PurchaseOrderRow) => void;
    /** Closes this dialog and opens the suppliers dialog instead. */
    onManageSuppliers: () => void;
  } = $props();

  /**
   * Two steps in one dialog, listed in the stepper on the left (on top on a
   * narrow screen). The steps are DialogViews views, so they slide, the
   * dialog grows or shrinks to each one, and focus follows; the stepper is
   * the sidebar, which stays put. First the PO as it is printed: number, date, supplier,
   * and a row for each fuel (po-details-step.svelte). Then each unit's
   * allocation of each fuel, which has to add up to that fuel's row before
   * the PO can be saved (po-allocation-step.svelte). What is typed lives in
   * `form`, which both steps share.
   */
  type Step = "details" | "allocate";
  let view = $state<Step>("details");

  const form = new AddPurchaseOrderForm();
  let submitting = $state(false);

  const STEPS: {
    name: Step;
    label: string;
    hint: string;
    title: string;
    description: string;
  }[] = [
    {
      name: "details",
      label: "PO details",
      hint: "As printed on the PO",
      title: "PO details",
      description: "Type the PO as it is printed.",
    },
    {
      name: "allocate",
      label: "Allocation",
      hint: "Each unit's fuel",
      title: "Allocate the fuel",
      description:
        "Split each fuel among the units that pay for it. Each fuel must add up to its liters on the PO.",
    },
  ];

  const stepIndex = $derived(STEPS.findIndex((step) => step.name === view));

  /** Tailwind's `md`: at this width and up the stepper runs down the side. */
  const wide = new MediaQuery("min-width: 768px");

  /** From the stepper, which only offers steps that are already done. */
  function goToStep(index: number) {
    if (STEPS[index]?.name === "details") goToDetails();
  }

  /**
   * Turns a step red in the stepper while one of its messages is showing,
   * so it is clear which step a problem belongs to.
   */
  function stepHasError(step: Step) {
    if (step === "details") {
      return DETAIL_FIELDS.some((field) => form.errors[field]);
    }
    return view === "allocate" && FUELS.some((fuel) => form.errors[fuel]);
  }

  let poNumberInput = $state<HTMLInputElement | null>(null);

  // Focus is moved by DialogViews: forward to the arriving step's first
  // field, back to where it was when that step was left.
  function goToDetails() {
    view = "details";
  }

  /** Next, from the details step: checked first, then on to the allocation. */
  function goToAllocate() {
    form.errors = form.detailErrors();
    if (Object.keys(form.errors).length > 0) return;
    form.prepareAllocations();
    view = "allocate";
  }

  function saved(row: PurchaseOrderRow) {
    onSaved(row);
    open = false;
  }

  // A fresh, empty form every time the dialog opens.
  $effect(() => {
    if (!open) return;
    untrack(() => {
      view = "details";
      form.reset(suppliers.map((s) => s.supplierPk));
    });
  });

  // The dialog always reopens on the first step. Reset once it has finished
  // closing, so the step does not change while the dialog fades out.
  function onOpenChangeComplete(isOpen: boolean) {
    if (!isOpen) view = "details";
  }
</script>

<Dialog.Root bind:open {onOpenChangeComplete}>
  <!--
    Escape on the allocation step goes back to the details, rather than
    closing the dialog and losing what was typed.
  -->
  <DialogViews.Content
    {view}
    title="Add purchase order"
    description="Two steps: the PO as it is printed, then each unit's allocation of the fuel."
    onBack={goToDetails}
    onOpenAutoFocus={(event) => {
      // The PO number, not the first button, which is in the stepper.
      event.preventDefault();
      poNumberInput?.focus();
    }}
    showCloseButton={view === "details"}
  >
    {#snippet sidebar()}
      <aside
        class="bg-muted/40 shrink-0 border-b p-4 md:w-48 md:border-r md:border-b-0"
      >
        <!--
          The dialog's title, as seen. Screen readers get it from
          DialogViews.Content. `pr-8` on a narrow screen keeps it clear of
          the close button.
        -->
        <p
          class="pr-8 text-base leading-none font-medium md:pr-0"
          aria-hidden="true"
        >
          Add purchase order
        </p>

        <!--
          Down the side from `md` up, across the top below that. The stepper
          lays itself out from `orientation`, so the width is read here rather
          than in CSS. Only a done step can be clicked, to go back to it; the
          way forward is Next, which checks the step first.
        -->
        <Stepper.Root
          bind:current={() => stepIndex, (index) => goToStep(index)}
          orientation={wide.current ? "vertical" : "horizontal"}
          class="mt-5"
        >
          {#each STEPS as step (step.name)}
            <Stepper.Item
              error={stepHasError(step.name)}
              loading={step.name === "allocate" && submitting}
              disabled={submitting}
            >
              <Stepper.Header>
                <Stepper.Title>{step.label}</Stepper.Title>
                <Stepper.Description class="hidden md:block">
                  {step.hint}
                </Stepper.Description>
              </Stepper.Header>
            </Stepper.Item>
          {/each}
        </Stepper.Root>
      </aside>
    {/snippet}

    <!--
      Each step's width, which the dialog adds the sidebar's to. Narrower
      than the screen minus the sidebar from `md` up; below that the sidebar
      is on top, so the step takes the full width and less height.
    -->
    {#each STEPS as step (step.name)}
      <DialogViews.View
        name={step.name}
        title={step.title}
        description={step.description}
        class={cn(
          step.name === "details" ? "md:w-sm" : "md:w-xl",
          "w-[calc(100vw-2rem)] max-h-[calc(100dvh-9rem)] md:max-w-[calc(100vw-14rem)] md:max-h-[min(44rem,calc(100dvh-2rem))]",
        )}
      >
        {#if step.name === "details"}
          <PoDetailsStep
            {form}
            {suppliers}
            bind:poNumberInput
            onNext={goToAllocate}
            onCancel={() => (open = false)}
            {onManageSuppliers}
          />
        {:else}
          <PoAllocationStep
            {form}
            {unitOptions}
            bind:submitting
            onBack={goToDetails}
            onSaved={saved}
            onDetailsRefused={goToDetails}
          />
        {/if}
      </DialogViews.View>
    {/each}
  </DialogViews.Content>
</Dialog.Root>
