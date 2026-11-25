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
    maxlength,
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

  // With a maxlength, a "233/255" count shows in the bottom-right corner once
  // the text is within 10% of the limit (at least 10 characters).
  const max = $derived(maxlength == null ? undefined : Number(maxlength));
  const length = $derived(String(value ?? "").length);
  const showCount = $derived(
    max !== undefined && max - length <= Math.max(10, Math.ceil(max * 0.1)),
  );

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

{#snippet field()}
  <!-- The bottom padding grows to give the count its own line, so the text
       never runs under it; the height follows the padding as it animates. -->
  <textarea
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(
      "rounded-lg border hover:border-ring border-input bg-transparent px-2.5 py-2 text-base transition-[color,background-color,border-color,box-shadow,padding] duration-200 ease-(--ease-out-strong) motion-reduce:transition-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      showCount && "pb-6",
      className,
    )}
    bind:value
    {maxlength}
    {...restProps}
    {onfocusout}
  ></textarea>
{/snippet}

<!-- Wrapped only when there is a count to place, so a textarea without a
     maxlength keeps its plain markup (InputGroup looks for a bare textarea). -->
{#if max !== undefined}
  <div data-slot="textarea-wrapper" class="relative w-full">
    {@render field()}
    <span
      aria-hidden="true"
      class={cn(
        "pointer-events-none absolute right-2.5 bottom-1.5 text-xs text-muted-foreground tabular-nums transition-[opacity,translate] duration-200 ease-(--ease-out-strong) motion-reduce:transition-none",
        showCount ? "opacity-100" : "translate-y-1 opacity-0",
      )}
    >
      {length}/{max}
    </span>
  </div>
{:else}
  {@render field()}
{/if}
