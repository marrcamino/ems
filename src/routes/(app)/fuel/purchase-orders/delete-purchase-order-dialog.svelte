<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import type { PurchaseOrderRow } from "./po-types.js";

  /** Asks before a PO is deleted, from the Delete PO button in its dialog. */
  let {
    open = $bindable(false),
    po,
    onDeleted,
  }: {
    open: boolean;
    po: PurchaseOrderRow | null;
    onDeleted: (purchaseOrderPk: number) => void;
  } = $props();

  const name = $derived(po ? `PO ${po.poNumber}` : "");

  let submitting = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115">
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {name}?</AlertDialog.Title>
      <AlertDialog.Description>
        The PO and each unit's allocation of it are removed. Deleting it cannot
        be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>
      <form
        method="POST"
        action="?/deletePurchaseOrder"
        autocomplete="off"
        use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            if (result.type === "success") {
              onDeleted(result.data?.deletedPk as number);
              toast.success(`${name} deleted`);
            } else {
              toast.error(`${name} not deleted`, {
                description:
                  result.type === "failure"
                    ? ((result.data as { error?: string } | undefined)?.error ??
                      "Try again.")
                    : "Try again. If it keeps happening, contact ICT.",
              });
            }
            open = false;
            submitting = false;
          };
        }}
      >
        <HiddenInput name="purchaseOrderPk" value={po?.purchaseOrderPk} />
        <button
          type="submit"
          disabled={submitting}
          class={buttonVariants({ variant: "destructive" })}
        >
          {#if submitting}
            <Spinner />
          {/if}
          Delete
        </button>
      </form>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
