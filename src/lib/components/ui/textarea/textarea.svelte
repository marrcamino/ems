<script lang="ts">
  import {
    cn,
    type WithElementRef,
    type WithoutChildren,
  } from "$lib/utils/index.js";
  import type { HTMLTextareaAttributes } from "svelte/elements";

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    "data-slot": dataSlot = "textarea",
    autoTrim = false,
    ...restProps
  }: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> & {
    /**
     * Trim the value and collapse repeated spaces when the field loses focus.
     * Line breaks are kept, so paragraphs survive; runs of blank lines are
     * reduced to one.
     *
     * @defaultValue `false`
     */
    autoTrim?: boolean;
  } = $props();

  function normalizeWhitespace(text: string) {
    return text
      .replace(/[^\S\n]+/g, " ") // runs of spaces/tabs become one space
      .replace(/[^\S\n]*\n[^\S\n]*/g, "\n") // no padding around line breaks
      .replace(/\n{3,}/g, "\n\n") // at most one blank line in a row
      .trim();
  }

  // Declared after the spread below so it wins, then forwards to any
  // onfocusout the consumer passed in.
  function onfocusout(
    e: FocusEvent & { currentTarget: EventTarget & HTMLTextAreaElement },
  ) {
    const el = e.currentTarget;
    if (autoTrim && !el.readOnly && !el.disabled) {
      const next = normalizeWhitespace(el.value);
      // Write the element as well as the state, so a consumer's onfocusout
      // below reads the trimmed text instead of waiting for the next flush.
      el.value = next;
      value = next;
    }
    restProps.onfocusout?.(e);
  }
</script>

<textarea
  bind:this={ref}
  data-slot={dataSlot}
  class={cn(
    "rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  bind:value
  {...restProps}
  {onfocusout}
></textarea>
