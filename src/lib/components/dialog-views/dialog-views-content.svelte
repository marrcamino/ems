<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { cn } from "$lib/utils/index.js";
  import { untrack, type ComponentProps, type Snippet } from "svelte";
  import { DialogViewsState, setDialogViews } from "./context.svelte.js";

  type Props = Omit<ComponentProps<typeof Dialog.Content>, "children"> & {
    /** The name of the view to show. Change it to slide to another view. */
    view: string;
    /**
     * Called when Escape is pressed on any view but the first. Leave it out
     * and Escape closes the whole dialog from every view.
     */
    onBack?: () => void;
    /**
     * The dialog's own title, for a dialog whose views are steps of one task
     * ("Add purchase order"). Screen readers then read this as the dialog's
     * title, and each view's heading is read as a heading inside it. Leave
     * it out and the dialog's title is the title of the view in view.
     */
    title?: string;
    description?: string;
    /**
     * Something that stays put beside the views while they slide, such as a
     * stepper: on the left from `md` up, across the top below that. Style
     * the element yourself; only its place is set here. The dialog's width
     * is the sidebar's plus the view's.
     */
    sidebar?: Snippet;
    children: Snippet;
  };

  let {
    view,
    onBack,
    title,
    description,
    sidebar,
    onEscapeKeydown,
    class: className,
    children,
    ...restProps
  }: Props = $props();

  const views = setDialogViews(
    new DialogViewsState(
      () => view,
      () => title !== undefined,
    ),
  );

  function handleEscape(event: KeyboardEvent) {
    onEscapeKeydown?.(event);
    if (event.defaultPrevented || !onBack || views.activeIndex <= 0) return;
    event.preventDefault();
    onBack();
  }

  /*
   * Focus follows the slide. A view that slides out becomes `inert`, which
   * would leave focus on nothing. Going forward, focus moves to the new
   * view's `[data-autofocus]` element, or else its first field or button.
   * Going back, it returns to whatever had focus when that view was left,
   * such as the Edit button that opened a form.
   */
  const lastFocus = new Map<string, HTMLElement>();
  let previous = untrack(() => view);
  let move: { from: string; to: string } | null = null;

  // Before the DOM updates, while the view being left still holds focus.
  $effect.pre(() => {
    const next = view;
    if (next === previous) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && views.nodeOf(previous)?.contains(focused)) {
      lastFocus.set(previous, focused);
    }
    move = { from: previous, to: next };
    previous = next;
  });

  // After it, once the arriving view has lost `inert` and can take focus.
  $effect(() => {
    void view;
    const current = move;
    move = null;
    if (!current) return;
    const node = views.nodeOf(current.to);
    if (!node) return;

    const isBack = views.indexOf(current.to) < views.indexOf(current.from);
    const remembered = isBack ? lastFocus.get(current.to) : undefined;
    const target =
      remembered?.isConnected && node.contains(remembered)
        ? remembered
        : firstFocusable(node);
    // A list keeps its own scroll position; focusing must not move it.
    target?.focus({ preventScroll: true });
  });

  function firstFocusable(node: HTMLElement) {
    return (
      node.querySelector<HTMLElement>("[data-autofocus]") ??
      [
        ...node.querySelectorAll<HTMLElement>(
          "input, select, textarea, button, a[href], [tabindex]",
        ),
      ].find(
        (el) =>
          el.tabIndex >= 0 &&
          !el.hasAttribute("disabled") &&
          el.getAttribute("type") !== "hidden",
      )
    );
  }
</script>

<!--
  The dialog takes its size from the frame inside it rather than from a fixed
  width, so it grows and shrinks along with the view in it.

  `overflow-clip`, not `overflow-hidden`, here and on the frame. A hidden box
  can still be scrolled by the browser: on open, the dialog focuses the first
  button while the frame is still zero wide, and the browser scrolled the
  frame sideways to bring it into view, leaving the view cut off.
-->
<Dialog.Content
  class={cn(
    "block w-auto gap-0 overflow-clip p-0 sm:max-w-[calc(100vw-2rem)]",
    sidebar && "flex flex-col md:flex-row",
    className,
  )}
  onEscapeKeydown={handleEscape}
  {...restProps}
>
  {@render sidebar?.()}

  <!--
    The frame. It is held at the size of the view in view and animates to the
    next view's size, at the same pace as the slide, so the two read as one
    movement. Width and height are layout properties, so this costs a layout
    per frame; it is only two numbers on one element, for 300ms. The first
    size is not animated, because it starts from `auto`, which CSS cannot
    interpolate from.
  -->
  <div
    class="relative shrink-0 overflow-clip transition-[width,height] duration-300 ease-out-strong motion-reduce:transition-none"
    style:width={views.activeSize ? `${views.activeSize.width}px` : undefined}
    style:height={views.activeSize ? `${views.activeSize.height}px` : undefined}
  >
    {@render children()}
  </div>

  <!--
    One title for the whole dialog, for screen readers: the `title` prop, or
    else the title of the view in view. The headings you can see belong to the views and slide with them.
    Written after the views so that they have registered by the time it is
    read.
  -->
  <Dialog.Title class="sr-only">{title ?? views.title}</Dialog.Title>
  {#if title !== undefined ? description : views.description}
    <Dialog.Description class="sr-only">
      {title !== undefined ? description : views.description}
    </Dialog.Description>
  {/if}
</Dialog.Content>
