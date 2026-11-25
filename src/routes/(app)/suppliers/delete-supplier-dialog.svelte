<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import type { Supplier } from "@/types";
  import { toast } from "svelte-sonner";

  let {
    open = $bindable(false),
    supplierToDelete = null,
    onDeleted,
  }: {
    open: boolean;
    supplierToDelete: Supplier | null;
    onDeleted: (supplierPk: number) => void;
  } = $props();

  const name = $derived(supplierToDelete?.supplierName ?? "");

  let submitting = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115">
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {name}?</AlertDialog.Title>
      <AlertDialog.Description>
        It is removed from the list of suppliers. Deleting it cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>
      <form
        method="POST"
        action="?/removeSupplier"
        autocomplete="off"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              onDeleted(result.data?.deletedPk as number);
              toast.success(`${name} deleted`);
              open = false;
            }

            if (result.type === "failure") {
              toast.error(`${name} not deleted`, {
                description:
                  (result.data as { error?: string } | undefined)?.error ??
                  "Try again.",
              });
              open = false;
            }

            await update({ reset: false });
            submitting = false;
          };
        }}
      >
        <HiddenInput name="supplierPk" value={supplierToDelete?.supplierPk} />
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
