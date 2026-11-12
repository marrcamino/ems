<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import type { AssetType } from "@/types";

  let {
    open = $bindable(false),
    noLongerUsed = null,
    onReactivate,
    onCloseAutoFocus,
  }: {
    open: boolean;
    noLongerUsed: AssetType | null;
    onReactivate: (row: AssetType) => void;
    /** Lets the page send focus somewhere other than where it was before. */
    onCloseAutoFocus?: (event: Event) => void;
  } = $props();

  const name = $derived(noLongerUsed?.assetTypeName ?? "");
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-115" {onCloseAutoFocus}>
    <AlertDialog.Header>
      <AlertDialog.Title>There is already a {name}</AlertDialog.Title>
      <AlertDialog.Description>
        It is inactive. Reactivating it keeps the assets already recorded as
        {name} attached to it, which adding a second {name} would not.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={() => {
          if (noLongerUsed) onReactivate(noLongerUsed);
        }}
      >
        Reactivate
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
