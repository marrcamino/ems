<script lang="ts">
  import { enhance } from "$app/forms";
  import * as DialogViews from "$lib/components/dialog-views/index.js";
  import * as Stepper from "$lib/components/stepper/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import Button from "@/components/ui/button/button.svelte";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { Supplier } from "@/types";
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import { toast } from "svelte-sonner";
  import DistributionStep from "./distribution-step.svelte";
  import StockStep from "./stock-step.svelte";
  import { DETAIL_FIELDS, PaperPoForm } from "./paper-po-form.svelte.js";
  import type { OfficeOption, PaperPoRow } from "./paper-po-types";
  import PoDetailsStep from "./po-details-step.svelte";

  /**
   * Adds or edits a paper PO in three steps: the PO as it is printed, each
   * office's reams on it, then what offices leave with GSU in its stock room.
   */
  let {
    open = $bindable(false),
    editing = null,
    suppliers,
    offices,
  }: {
    open: boolean;
    editing?: PaperPoRow | null;
    /** Active suppliers only. */
    suppliers: Supplier[];
    /** Active offices only. */
    offices: OfficeOption[];
  } = $props();

  type Step = "details" | "distribute" | "stock";
  let view = $state<Step>("details");

  const form = new PaperPoForm();
  let submitting = $state(false);

  const STEPS: {
    name: Step;
    label: string;
    hint: string;
    description: string;
  }[] = [
    {
      name: "details",
      label: "PO details",
      hint: "As printed on the PO",
      description: "Type the PO as it is printed.",
    },
    {
      name: "distribute",
      label: "Distribution",
      hint: "Each office's reams",
      description:
        "Each office's reams on the PO, as it asked for them, GSU included.",
    },
    {
      name: "stock",
      label: "Stock room",
      hint: "Left with GSU",
      description:
        "Reams an office leaves with GSU, kept in the stock room for that office until it takes them.",
    },
  ];

  const stepIndex = $derived(STEPS.findIndex((s) => s.name === view));
  const wide = new MediaQuery("min-width: 768px");

  function goToDistribute() {
    form.errors = form.detailErrors();
    if (Object.keys(form.errors).length > 0) return;
    // A first office row is there already, ready to fill in.
    if (form.rows.length === 0) form.addRow();
    view = "distribute";
  }

  function goToStock() {
    form.errors = form.distributionErrors();
    if (Object.keys(form.errors).length > 0) return;
    form.seedHandOverOn();
    form.syncLeft();
    view = "stock";
  }

  $effect(() => {
    if (!open) return;
    untrack(() => {
      if (editing) form.load(editing);
      else form.reset(suppliers.map((s) => s.supplierPk));
      view = "details";
    });
  });

  /** An edited PO keeps its own supplier, archived or not. */
  const supplierChoices = $derived.by(() => {
    if (
      !editing?.supplierFk ||
      suppliers.some((s) => s.supplierPk === editing.supplierFk)
    ) {
      return suppliers;
    }
    return [
      ...suppliers,
      {
        supplierPk: editing.supplierFk,
        supplierName: `${editing.supplierName} (archived)`,
      },
    ];
  });

  /** An edited PO keeps its own offices, deactivated or not. */
  const officeChoices = $derived.by(() => {
    if (!editing) return offices;
    const extra = editing.distributions
      .filter((d) => !offices.some((o) => o.orgUnitPk === d.orgUnitPk))
      .map(({ orgUnitPk, orgUnitName, abbr }) => ({
        orgUnitPk,
        orgUnitName,
        abbr,
      }));
    return [...offices, ...extra];
  });

  const dialogTitle = $derived(
    editing ? `Edit PO ${editing.poNumber}` : "Add purchase order",
  );

  let poNumberInput = $state<HTMLInputElement | null>(null);
  let deleteOpen = $state(false);
  let deleting = $state(false);
</script>

<Dialog.Root
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) view = "details";
  }}
>
  <DialogViews.Content
    {view}
    title={dialogTitle}
    description="Three steps: the PO as it is printed, each office's reams, and what offices leave with GSU."
    onBack={() => (view = "details")}
    onOpenAutoFocus={(event) => {
      if (view !== "details") return;
      event.preventDefault();
      poNumberInput?.focus();
    }}
    showCloseButton={view === "details"}
    data-nested={deleteOpen}
  >
    {#snippet sidebar()}
      <aside
        class="bg-muted/40 flex shrink-0 flex-col border-b p-4 md:w-48 md:border-r md:border-b-0"
      >
        <p
          class="pr-8 text-base leading-none font-medium md:pr-0"
          aria-hidden="true"
        >
          {dialogTitle}
        </p>
        <Stepper.Root
          bind:current={
            () => stepIndex,
            (index) => {
              // Back to an earlier step only; forward goes through Next.
              if (index < stepIndex) view = STEPS[index].name;
            }
          }
          orientation={wide.current ? "vertical" : "horizontal"}
          class="mt-5"
        >
          {#each STEPS as step (step.name)}
            <Stepper.Item
              error={step.name === "details"
                ? DETAIL_FIELDS.some((f) => form.errors[f])
                : step.name === "distribute"
                  ? !!form.errors.distribution
                  : view === "stock" &&
                    Object.keys(form.errors).some(
                      (f) => !DETAIL_FIELDS.includes(f) && f !== "distribution",
                    )}
              loading={step.name === "stock" && submitting}
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

        {#if editing}
          <Button
            class="mt-auto"
            variant="secondary-destructive"
            disabled={submitting}
            onclick={() => (deleteOpen = true)}
          >
            Delete PO
          </Button>
        {/if}
      </aside>
    {/snippet}

    {#each STEPS as step (step.name)}
      <DialogViews.View
        name={step.name}
        title={step.label}
        description={step.description}
        class="w-[calc(100vw-2rem)] max-h-[calc(100dvh-9rem)] md:w-lg md:max-w-[calc(100vw-14rem)] md:min-h-[min(553px,calc(100dvh-2rem))] md:max-h-[min(44rem,calc(100dvh-2rem))]"
      >
        {#if step.name === "details"}
          <PoDetailsStep
            {form}
            suppliers={supplierChoices}
            bind:poNumberInput
            onNext={goToDistribute}
            onCancel={() => (open = false)}
          />
        {:else if step.name === "distribute"}
          <DistributionStep
            {form}
            offices={officeChoices}
            onBack={() => (view = "details")}
            onNext={goToStock}
          />
        {:else}
          <StockStep
            {form}
            offices={officeChoices}
            bind:submitting
            onBack={() => (view = "distribute")}
            onSaved={() => (open = false)}
            onRefused={(step) => (view = step)}
          />
        {/if}
      </DialogViews.View>
    {/each}

    <AlertDialog.Root bind:open={deleteOpen}>
      <AlertDialog.Content class="sm:max-w-115">
        <AlertDialog.Header>
          <AlertDialog.Title>Delete PO {editing?.poNumber}?</AlertDialog.Title>
          <AlertDialog.Description>
            The PO and each office's reams from it are removed. Deleting it
            cannot be undone.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
          <AlertDialog.Cancel disabled={deleting}>Cancel</AlertDialog.Cancel>
          <form
            method="POST"
            action="?/deletePaperPurchaseOrder"
            use:enhance={() => {
              deleting = true;
              const name = `PO ${editing?.poNumber}`;
              return async ({ result, update }) => {
                if (result.type === "success") {
                  toast.success(`${name} deleted`);
                  open = false;
                } else {
                  toast.error(`${name} not deleted`, {
                    description:
                      result.type === "failure"
                        ? ((result.data as { error?: string } | undefined)
                            ?.error ?? "Try again.")
                        : "Try again. If it keeps happening, contact ICT.",
                  });
                }
                deleteOpen = false;
                await update({ invalidateAll: true });
                deleting = false;
              };
            }}
          >
            <HiddenInput
              name="paperPurchaseOrderPk"
              value={editing?.paperPurchaseOrderPk}
            />
            <button
              type="submit"
              disabled={deleting}
              class={buttonVariants({ variant: "destructive" })}
            >
              {#if deleting}
                <Spinner />
              {/if}
              Delete
            </button>
          </form>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog.Root>
  </DialogViews.Content>
</Dialog.Root>
