<script lang="ts">
	import { Label as LabelPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/index.js";

	/**
	 * `note` adds a short side note after the label, in brackets and grey, so
	 * every label writes it the same way:
	 *
	 * ```svelte
	 * <Label for="plateNumber" note="if any">Plate number</Label>
	 * ```
	 *
	 * shows "Plate number (if any)". Also for a caption such as "Section
	 * Incharge". `required` adds a red asterisk at the end, for a field that
	 * must be filled in; it only shows, so the input needs its own
	 * `required` too. Field.Label passes both on.
	 *
	 * ```svelte
	 * <Label for="destination" required>Destination</Label>
	 * ```
	 */
	let {
		ref = $bindable(null),
		class: className,
		note,
		required = false,
		children,
		...restProps
	}: LabelPrimitive.RootProps & { note?: string; required?: boolean } = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		"gap-2 text-sm leading-none font-medium group-data-[disabled=true]:opacity-50 peer-disabled:opacity-50 flex items-center select-none group-data-[disabled=true]:pointer-events-none peer-disabled:cursor-not-allowed",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	{#if note}
		<!-- -ml-1: a word's space from the label, not the label's gap-2. -->
		<span class="text-muted-foreground -ml-1 font-normal">({note})</span>
	{/if}
	{#if required}
		<!-- Hidden from screen readers: the input's own `required` tells them. -->
		<span class="text-destructive -ml-1" aria-hidden="true">*</span>
	{/if}
</LabelPrimitive.Root>
