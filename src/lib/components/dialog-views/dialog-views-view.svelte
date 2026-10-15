<script lang="ts">
  import { cn } from "$lib/utils/index.js";
  import { onDestroy, untrack, type Snippet } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { getDialogViews } from "./context.svelte.js";

  type Props = {
    /** What DialogViews.Content's `view` is set to, to show this view. */
    name: string;
    /** Shown at the top of the view, and read out as the dialog's title. */
    title: string;
    description?: string;
    /**
     * Sets the view's width, which the dialog grows or shrinks to. Defaults
     * to `w-md`.
     */
    class?: string;
    children: Snippet;
  };

  let {
    name,
    title,
    description,
    class: className,
    children,
  }: Props = $props();

  const views = getDialogViews();
  // A view is registered once, under the name it starts with. Its place in
  // the order is fixed from then on, so `name` is not meant to change.
  const registeredName = untrack(() => name);
  views.register(registeredName, {
    title: () => title,
    description: () => description,
  });
  onDestroy(() => views.unregister(registeredName));

  /**
   * Where this view sits relative to the one in view: views before it wait
   * off to the left, views after it off to the right. Moving to a later view
   * therefore pushes the current one out to the left, and Back reverses it.
   */
  const offset = $derived.by(() => {
    const here = views.indexOf(name);
    const active = views.activeIndex;
    if (here === active) return "translate-x-0";
    return here < active
      ? "-translate-x-full opacity-0"
      : "translate-x-full opacity-0";
  });

  /**
   * Reports the view's size as it lays itself out. `offsetWidth` ignores
   * transforms, so neither the slide nor the dialog's own zoom on open gets
   * into the number.
   */
  const measure: Attachment<HTMLElement> = (node) => {
    views.setNode(name, node);
    const observer = new ResizeObserver(() => {
      views.sizes[name] = {
        width: node.offsetWidth,
        height: node.offsetHeight,
      };
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      views.setNode(name, null);
      views.sizes[name] = null;
    };
  };
</script>

<!--
  Every view stays mounted, stacked at the frame's top left, each at its own
  width. Only the one in view can be reached (`inert` on the others). They
  slide with a CSS transition rather than a Svelte one, so going back in the
  middle of a slide turns it around from where it is. Tailwind v4 moves them
  with the `translate` property, so that is what transitions, not
  `transform`. With reduced motion they only fade.

  The heading is hidden from screen readers when DialogViews.Content already
  gives the dialog the same title, that is, when it has no `title` of its
  own.
-->
<section
  {@attach measure}
  class={cn(
    "absolute top-0 left-0 flex w-md max-w-[calc(100vw-2rem)] max-h-[min(40rem,calc(100dvh-2rem))] flex-col gap-4 p-4 transition-[translate,opacity] duration-300 ease-out-strong motion-reduce:translate-x-0",
    offset,
    className,
  )}
  inert={views.view !== name}
>
  <!-- `pr-8` keeps the text clear of the dialog's close button. -->
  <div class="flex flex-col gap-1 pr-8" aria-hidden={views.titled ? undefined : "true"}>
    <h2 class="flex min-h-7 items-center text-base leading-none font-medium">
      {title}
    </h2>
    {#if description}
      <p class="text-muted-foreground text-sm">{description}</p>
    {/if}
  </div>

  {@render children()}
</section>
