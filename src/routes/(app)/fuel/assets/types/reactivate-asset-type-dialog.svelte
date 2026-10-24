<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import type { AssetType } from "@/types";
  import { meterTypePhrase } from "./meter-types.js";

  let {
    open = $bindable(false),
    noLongerUsed = null,
    onUseAgain,
    onCloseAutoFocus,
  }: {
    open: boolean;
    noLongerUsed: AssetType | null;
    /** Hands the existing row to the edit form rather than saving it here. */
    onUseAgain: (row: AssetType) => void;
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
        It is inactive, which is why it is not in the list. Reactivating it
        keeps the assets already recorded as {name} attached to
        it, which adding a second {name} would not.
        {#if noLongerUsed}
          It is recorded as having {meterTypePhrase(noLongerUsed.meterType)},
          so check that is still right.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>

    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <!--
        This opens the existing row in the edit form rather than putting it
        back into use straight away, because the meter recorded against it may
        be wrong and this is the moment somebody can see it and say so.
      -->
      <AlertDialog.Action
        onclick={() => {
          if (noLongerUsed) onUseAgain(noLongerUsed);
        }}
      >
        Reactivate
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
