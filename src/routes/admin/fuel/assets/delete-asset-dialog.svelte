<script lang="ts">
  import { enhance } from "$app/forms";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { toast } from "svelte-sonner";
  import type { AssetRow } from "./asset-row.js";

  let {
    open = $bindable(false),
    assetToDelete = null,
    onDeleted,
  }: {
    open: boolean;
    assetToDelete: AssetRow | null;
    onDeleted: (assetPk: number) => void;
  } = $props();

  const name = $derived(assetToDelete?.assetName ?? "");

  let submitting = $state(false);
</script>

<!--
  One question only for now. No fuel record points at an asset yet, so
  every asset can be deleted; once fuel is recorded the server refuses and
  says to switch it off instead, and this dialog can grow the same two forms
  the asset type one has.
-->
<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115">
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {name}?</AlertDialog.Title>
      <AlertDialog.Description>
        Deleting it cannot be undone. If the office no longer has it but it was
        once used, edit it and turn off "Active" instead.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>Cancel</AlertDialog.Cancel>
      <form
        method="POST"
        action="?/remove"
        use:enhance={() => {
          submitting = true;
          return async ({ result, update }) => {
            if (result.type === "success") {
              onDeleted(result.data?.deletedPk as number);
              toast.success(`${name} was deleted`);
            }

            if (result.type === "failure") {
              toast.error(
                (result.data as { error?: string } | undefined)?.error ??
                  "Something went wrong.",
              );
            }

            open = false;
            await update({ reset: false });
            submitting = false;
          };
        }}
      >
        <HiddenInput name="assetPk" value={assetToDelete?.assetPk} />
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
