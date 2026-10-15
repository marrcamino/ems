/**
 * A dialog that holds several views and slides between them, growing or
 * shrinking to fit each one, instead of opening a second dialog on top. Use it
 * for a list and its add or edit form, or for steps. A confirmation such as
 * "Delete this?" still belongs in an AlertDialog on top.
 *
 * ```svelte
 * <Dialog.Root bind:open onOpenChangeComplete={(o) => !o && (view = "list")}>
 *   <DialogViews.Content {view} onBack={() => (view = "list")}>
 *     <DialogViews.View name="list" title="Suppliers">…</DialogViews.View>
 *     <DialogViews.View name="form" title="Add supplier" class="w-lg">…</DialogViews.View>
 *   </DialogViews.Content>
 * </Dialog.Root>
 * ```
 *
 * For steps of one task, give the dialog its own `title`, and put what stays
 * put while the steps slide (a stepper) in `sidebar`:
 *
 * ```svelte
 * <DialogViews.Content {view} title="Add purchase order" onBack={back}>
 *   {#snippet sidebar()}<aside class="md:w-48 …">…stepper…</aside>{/snippet}
 *   <DialogViews.View name="details" title="PO details">…</DialogViews.View>
 *   <DialogViews.View name="allocate" title="Allocate the fuel">…</DialogViews.View>
 * </DialogViews.Content>
 * ```
 */
import Content from "./dialog-views-content.svelte";
import View from "./dialog-views-view.svelte";

export { Content, View };
