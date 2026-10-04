<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	export const tabsListVariants = tv({
		base: "relative rounded-lg p-[3px] group-data-horizontal/tabs:h-8 data-[variant=line]:rounded-none group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
		variants: {
			variant: {
				default: "cn-tabs-list-variant-default bg-muted",
				line: "cn-tabs-list-variant-line gap-6 bg-transparent w-full justify-start rounded-none border-b p-0 group-data-horizontal/tabs:h-10",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type TabsListVariant = VariantProps<typeof tabsListVariants>["variant"];
</script>

<script lang="ts">
	import { Tabs as TabsPrimitive } from "bits-ui";
	import { cn } from "$lib/utils/index.js";

	let {
		ref = $bindable(null),
		variant = "default",
		class: className,
		children,
		...restProps
	}: TabsPrimitive.ListProps & {
		variant?: TabsListVariant;
	} = $props();

	// Where the sliding indicator sits: the active trigger's box, measured
	// relative to this list. Null while no trigger is active.
	let box = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let vertical = $state(false);
	// Off for the first placement so the indicator does not slide in from the corner.
	let animate = $state(false);

	$effect(() => {
		const list = ref;
		if (!list) return;

		const measure = () => {
			vertical = list.getAttribute("data-orientation") === "vertical";
			const active = list.querySelector<HTMLElement>(
				'[data-slot="tabs-trigger"][data-state="active"]',
			);
			box = active
				? {
						x: active.offsetLeft,
						y: active.offsetTop,
						width: active.offsetWidth,
						height: active.offsetHeight,
					}
				: null;
		};

		// Tab labels can change width (the counts in the asset types dialog do),
		// so every trigger is watched, not only the list.
		const resizeObserver = new ResizeObserver(measure);
		const observeTriggers = () => {
			resizeObserver.disconnect();
			resizeObserver.observe(list);
			list
				.querySelectorAll('[data-slot="tabs-trigger"]')
				.forEach((trigger) => resizeObserver.observe(trigger));
		};

		const mutationObserver = new MutationObserver((mutations) => {
			if (mutations.some((m) => m.type === "childList")) observeTriggers();
			measure();
		});
		mutationObserver.observe(list, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: ["data-state", "data-orientation"],
		});

		observeTriggers();
		measure();
		const frame = requestAnimationFrame(() => (animate = true));

		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			mutationObserver.disconnect();
		};
	});

	// The line variant draws a 2px bar along the list's edge, so it only follows
	// the trigger along one axis. The default variant fills the whole trigger.
	const indicatorStyle = $derived.by(() => {
		if (!box) return "";
		if (variant === "line") {
			return vertical
				? `transform: translateY(${box.y}px); height: ${box.height}px;`
				: `transform: translateX(${box.x}px); width: ${box.width}px;`;
		}
		return `transform: translate(${box.x}px, ${box.y}px); width: ${box.width}px; height: ${box.height}px;`;
	});
</script>

<TabsPrimitive.List
	bind:ref
	data-slot="tabs-list"
	data-variant={variant}
	class={cn(tabsListVariants({ variant }), className)}
	{...restProps}
>
	<!-- Placed before the triggers so they paint on top of it. -->
	<span
		aria-hidden="true"
		data-slot="tabs-indicator"
		class={cn(
			"pointer-events-none absolute",
			variant === "line"
				? vertical
					? "top-0 -right-1 w-0.5 bg-primary"
					: "left-0 -bottom-px h-0.5 bg-primary"
				: "top-0 left-0 rounded-md border border-transparent bg-background shadow-sm dark:bg-input/50",
			animate &&
				"transition-[transform,width,height] duration-200 ease-in-out-strong motion-reduce:transition-none",
			!box && "hidden",
		)}
		style={indicatorStyle}
	></span>
	{@render children?.()}
</TabsPrimitive.List>
