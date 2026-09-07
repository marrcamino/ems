<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from "bits-ui";
	import { setOpenComplete } from "../open-complete.svelte.js";

	let {
		open = $bindable(false),
		onOpenChangeComplete,
		...restProps
	}: AlertDialogPrimitive.RootProps = $props();

	setOpenComplete(() => onOpenChangeComplete?.(true));
</script>

<AlertDialogPrimitive.Root
	bind:open
	onOpenChangeComplete={(isOpen) => {
		// Only the closing half arrives from Bits UI; the content wrapper fires the
		// opening half. Ignoring a truthy value here keeps the callback from running
		// twice if a later Bits UI version starts reporting opens too.
		if (!isOpen) onOpenChangeComplete?.(false);
	}}
	{...restProps}
/>
