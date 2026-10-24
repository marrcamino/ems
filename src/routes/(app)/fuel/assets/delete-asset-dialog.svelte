<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import HiddenInput from "@/components/ui/hidden-input.svelte";
  import Spinner from "@/components/ui/spinner/spinner.svelte";
  import { CircleAlert, CircleOff } from "@lucide/svelte/icons";
  import { toast } from "svelte-sonner";
  import type { AssetRow } from "./asset-row.js";

  let {
    open = $bindable(false),
    assetToDelete = null,
    onDeleted,
    onDeactivate,
  }: {
    open: boolean;
    assetToDelete: AssetRow | null;
    onDeleted: (assetPk: number) => void;
    onDeactivate: (row: AssetRow) => void;
  } = $props();

  const name = $derived(assetToDelete?.assetName ?? "");

  let submitting = $state(false);

  /**
   * Set when the server refuses because fuel is recorded for the asset. The
   * page does not load fuel records, so this is only known after Delete is
   * pressed; the reason then stays in the dialog, next to the fix, rather
   * than in a toast that disappears.
   */
  let refusal: { message: string; deactivateInstead: boolean } | null =
    $state(null);

  // Each time the dialog opens it starts from the question again.
  $effect(() => {
    if (open) refusal = null;
  });
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115">
    <AlertDialog.Header>
      <AlertDialog.Title>Delete {name}?</AlertDialog.Title>
      <AlertDialog.Description>
        This removes the asset from the system. It cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if refusal}
      <Alert.Root variant="danger">
        <CircleAlert />
        <Alert.Title>Asset not deleted</Alert.Title>
        <Alert.Description>{refusal.message}</Alert.Description>
      </Alert.Root>
    {/if}

    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={submitting}>
        {refusal ? "Close" : "Cancel"}
      </AlertDialog.Cancel>

      {#if refusal}
        {#if refusal.deactivateInstead && assetToDelete}
          {@const row = assetToDelete}
          <button
            type="button"
            class={buttonVariants({ variant: "default" })}
            onclick={() => {
              open = false;
              onDeactivate(row);
            }}
          >
            <CircleOff /> Deactivate
          </button>
        {/if}
      {:else}
        <form
          method="POST"
          action="?/remove"
          use:enhance={() => {
            submitting = true;
            return async ({ result, update }) => {
              if (result.type === "success") {
                onDeleted(result.data?.deletedPk as number);
                toast.success(`${name} was deleted`);
                open = false;
              }

              if (result.type === "failure") {
                const data = result.data as
                  | { error?: string; deactivateInstead?: boolean }
                  | undefined;

                if (data?.deactivateInstead !== undefined && data.error) {
                  // Refused because of recorded fuel: keep the dialog open.
                  refusal = {
                    message: data.error,
                    deactivateInstead: data.deactivateInstead,
                  };
                } else {
                  toast.error(data?.error ?? "Something went wrong.");
                  open = false;
                }
              }

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
      {/if}
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
