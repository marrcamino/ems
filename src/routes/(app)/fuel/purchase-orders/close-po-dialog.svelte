<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import HiddenInput from "$lib/components/ui/hidden-input.svelte";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { CircleAlert, TriangleAlert } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import { closeCheck } from "./po-close.js";
  import type { PurchaseOrderRow } from "./po-types.js";

  /**
   * The check that opens when Close PO is pressed (point 7.3 of "How POs and
   * withdrawal slips work"): problems that stop the close, and warnings that
   * do not. Close stays unavailable while a problem is listed, since the
   * reason is shown right above it.
   */
  let {
    open = $bindable(false),
    po,
    onClosed,
  }: {
    open: boolean;
    po: PurchaseOrderRow | null;
    onClosed: (closedAt: string) => void;
  } = $props();

  const check = $derived(po ? closeCheck(po) : { problems: [], warnings: [] });
  let submitting = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-125">
    <AlertDialog.Header>
      <AlertDialog.Title>Close PO {po?.poNumber}?</AlertDialog.Title>
      <AlertDialog.Description>
        Close a PO once the supplier is paid. Its withdrawals are then locked
        until the PO is reopened.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if check.problems.length > 0}
      <Alert.Root variant="danger">
        <CircleAlert />
        <Alert.Title>The PO cannot be closed yet</Alert.Title>
        <Alert.Description>
          <ul class="list-disc pl-4">
            {#each check.problems as problem (problem)}
              <li>{problem}</li>
            {/each}
          </ul>
        </Alert.Description>
      </Alert.Root>
    {/if}

    {#if check.warnings.length > 0}
      <Alert.Root variant="warning">
        <TriangleAlert />
        <Alert.Title>Check these before closing</Alert.Title>
        <Alert.Description>
          <ul class="list-disc pl-4">
            {#each check.warnings as warning (warning)}
              <li>{warning}</li>
            {/each}
          </ul>
        </Alert.Description>
      </Alert.Root>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>
      <form
        method="POST"
        action="?/closePurchaseOrder"
        use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            submitting = false;
            if (result.type === "success") {
              onClosed(result.data?.closedAt as string);
              open = false;
              toast.success(`PO ${po?.poNumber} closed`);
              return;
            }
            toast.error(`PO ${po?.poNumber} not closed`, {
              description:
                result.type === "failure"
                  ? ((result.data as { error?: string } | undefined)?.error ??
                    "Try again.")
                  : "Try again. If it keeps happening, contact ICT.",
            });
          };
        }}
      >
        <HiddenInput name="purchaseOrderPk" value={po?.purchaseOrderPk} />
        <Button
          type="submit"
          disabled={submitting || check.problems.length > 0}
        >
          {#if submitting}
            <Spinner />
          {/if}
          {check.warnings.length > 0 ? "Close anyway" : "Close PO"}
        </Button>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
