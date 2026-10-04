# Components (Svelte 5 + shadcn-svelte)

Snippets for each row of the Step 2 matrix. Checked against the shadcn-svelte docs and source (Sept 2026).

Before using:
- Match the icon import path the project already uses. Current shadcn-svelte uses `@lucide/svelte/icons/...`; older projects use `lucide-svelte/icons/...`.
- Install missing components with npm: `npx shadcn-svelte@latest add alert alert-dialog sonner field empty`.

## Contents

1. Add warning / success / info variants to Alert
2. Field error
3. Form error summary
4. Toasts (Sonner)
5. Page / section alert (warning with a fix button)
6. Info alert (callout)
7. Confirm dialog
8. Empty state

---

## 1. Add warning / success / info variants to Alert

shadcn-svelte's `Alert` ships only `default` and `destructive`. Add the other variants in the project's own `src/lib/components/ui/alert/alert.svelte`, inside `tv({ variants: { variant: { ... } } })`:

```ts
variant: {
	default: "...keep existing...",
	destructive: "...keep existing...",
	warning:
		"border-amber-500/40 bg-amber-50 text-amber-900 *:data-[slot=alert-description]:text-amber-900/80 dark:bg-amber-950/40 dark:text-amber-200 dark:*:data-[slot=alert-description]:text-amber-200/80",
	success:
		"border-emerald-500/40 bg-emerald-50 text-emerald-900 *:data-[slot=alert-description]:text-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:*:data-[slot=alert-description]:text-emerald-200/80",
	info:
		"border-sky-500/40 bg-sky-50 text-sky-900 *:data-[slot=alert-description]:text-sky-900/80 dark:bg-sky-950/40 dark:text-sky-200 dark:*:data-[slot=alert-description]:text-sky-200/80",
},
```

`Alert.Root` always sets `role="alert"`. For info, success, and neutral alerts pass `role="status"` so screen readers don't interrupt the user.

## 2. Field error

No title, no button. One sentence that states the fix. Keep the typed value.

```svelte
<script lang="ts">
	import * as Field from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";

	let plate = $state("");
	let plateError = $state<string | null>(null);

	function checkPlate() {
		plateError = plate.trim() ? null : "Enter a plate number, like ABC 1234.";
	}
</script>

<Field.Field data-invalid={!!plateError}>
	<Field.Label for="plate">Plate number</Field.Label>
	<Input id="plate" bind:value={plate} onblur={checkPlate} aria-invalid={!!plateError} />
	{#if plateError}
		<Field.Error>{plateError}</Field.Error>
	{/if}
</Field.Field>
```

`Field.Error` also accepts `errors={[{ message }]}` (for form libraries that return arrays).

## 3. Form error summary

For long forms with several errors: one destructive alert at the top (title only), plus `Field.Error` on each field. Move focus to the summary on submit.

```svelte
<script lang="ts">
	import * as Alert from "$lib/components/ui/alert/index.js";
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";

	let { errorCount }: { errorCount: number } = $props();
	let summary = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (errorCount > 0) summary?.focus();
	});
</script>

{#if errorCount > 0}
	<Alert.Root bind:ref={summary} variant="destructive" tabindex={-1}>
		<CircleAlertIcon />
		<Alert.Title>
			{errorCount === 1 ? "1 field needs fixing" : `${errorCount} fields need fixing`}
		</Alert.Title>
	</Alert.Root>
{/if}
```

## 4. Toasts (Sonner)

`<Toaster />` must be in `+layout.svelte` once. Toast title = first argument; body = `description`.

```ts
import { toast } from "svelte-sonner";

// success: title only
toast.success("Asset saved");

// success with undo: undo is time-limited by nature, so a timed toast is fine;
// give it ~10 s so people have time to react
toast.success("Asset deleted", {
	action: { label: "Undo", onClick: () => restoreAsset(id) },
	duration: 10000
});

// error with retry: stays until dismissed because it has an action
toast.error("Asset not saved", {
	description: "Check your connection and try again.",
	action: { label: "Retry", onClick: () => saveAsset() },
	duration: Number.POSITIVE_INFINITY
});

// neutral
toast("Syncing records");

// neutral → success/error in one call
toast.promise(syncRecords(), {
	loading: "Syncing records",
	success: "Records synced",
	error: "Records not synced"
});
```

Add `closeButton` to `<Toaster />` if long-lived toasts need an X.

## 5. Page / section alert (warning with a fix button)

Put the button inside the message. `Alert.Action` sits absolutely in the top-right corner with little room, so it only fits one-word labels ("Retry"). For longer labels, place the button under the text.

```svelte
<script lang="ts">
	import * as Alert from "$lib/components/ui/alert/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

	let { onAddType }: { onAddType: () => void } = $props();
</script>

<Alert.Root variant="warning">
	<TriangleAlertIcon />
	<Alert.Title>No asset types yet</Alert.Title>
	<Alert.Description>
		<p>Add one to start adding assets. Each asset needs a type, like motorcycle or generator.</p>
		<Button size="sm" onclick={onAddType}>Add asset type</Button>
	</Alert.Description>
</Alert.Root>
```

Short label variant:

```svelte
<Alert.Root variant="destructive">
	<CircleAlertIcon />
	<Alert.Title>Can't load assets</Alert.Title>
	<Alert.Description>Try again. If it keeps happening, contact ICT.</Alert.Description>
	<Alert.Action>
		<Button size="sm" variant="outline" onclick={load}>Retry</Button>
	</Alert.Action>
</Alert.Root>
```

## 6. Info alert (callout)

Often no title, no button, no X. Place it right above the input or button it affects.

```svelte
<script lang="ts">
	import * as Alert from "$lib/components/ui/alert/index.js";
	import InfoIcon from "@lucide/svelte/icons/info";
</script>

<Alert.Root variant="info" role="status">
	<InfoIcon />
	<Alert.Description>Reports count only approved fuel records.</Alert.Description>
</Alert.Root>
```

## 7. Confirm dialog

Title = verb + object + "?". Body = what is lost + whether it can be undone. Buttons = the title's verb + Cancel.

```svelte
<script lang="ts">
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

	let {
		open = $bindable(false),
		assetName,
		recordCount,
		onDelete
	}: {
		open?: boolean;
		assetName: string;
		recordCount: number;
		onDelete: () => void;
	} = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete {assetName}?</AlertDialog.Title>
			<AlertDialog.Description>
				Its {recordCount} fuel records will be deleted too. This can't be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				onclick={() => {
					onDelete();
					open = false;
				}}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
```

If the project's `AlertDialog.Action` has no `variant` prop (older versions), use `class={buttonVariants({ variant: "destructive" })}`.

## 8. Empty state

```svelte
<script lang="ts">
	import * as Empty from "$lib/components/ui/empty/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import PackageIcon from "@lucide/svelte/icons/package";

	let { onAdd }: { onAdd: () => void } = $props();
</script>

<Empty.Root>
	<Empty.Header>
		<Empty.Media variant="icon"><PackageIcon /></Empty.Media>
		<Empty.Title>No assets yet</Empty.Title>
		<Empty.Description>Add a vehicle or generator to start recording fuel.</Empty.Description>
	</Empty.Header>
	<Empty.Content>
		<Button onclick={onAdd}>Add asset</Button>
	</Empty.Content>
</Empty.Root>
```
