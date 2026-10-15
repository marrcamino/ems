<script lang="ts">
  import { Calendar } from "$lib/components/ui/calendar/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { LOCALE } from "$lib/utils/format-number.js";
  import { cn } from "$lib/utils/index.js";
  import type { DateValue } from "@internationalized/date";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import { DateField } from "bits-ui";
  import { untrack } from "svelte";

  /**
   * A date the user can type or pick. It is the shadcn-svelte date picker
   * (a Popover holding a Calendar) with the button swapped for a field
   * whose month, day and year can each be typed into.
   *
   *   <DateInput id="po-date" bind:value={poDate} maxValue={today(tz)} />
   *
   * Click a part and type the number, or press the up and down arrow keys
   * to change it. The field moves to the next part by itself. Alt + down
   * arrow, or the calendar button, opens the calendar.
   *
   * `value` is a CalendarDate, or undefined until all three parts are
   * filled in. Emptying one part leaves the other two as they were. A
   * typed date outside minValue and maxValue is kept and the field turns
   * red; the page decides what message to show.
   *
   * Inside a form it acts like a normal input. With `required`, saving
   * with no date stops the form and the browser shows its own message on
   * the field. Resetting the form puts the field back to the date that it
   * started with. To empty the field from code, call `clear()`; setting
   * `value` to undefined misses the leftover parts of a half-typed date.
   *
   *   <DateInput bind:this={slipField} bind:value={slipDate} />
   *   slipField.clear();
   */
  let {
    value = $bindable(),
    id,
    name,
    minValue,
    maxValue,
    disabled = false,
    required = false,
    captionLayout = "label",
    class: className,
    "aria-invalid": ariaInvalid,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
  }: {
    value?: DateValue;
    id?: string;
    /** Sends the date as yyyy-mm-dd, or empty, with a form post. */
    name?: string;
    minValue?: DateValue;
    maxValue?: DateValue;
    disabled?: boolean;
    required?: boolean;
    /** "dropdown" puts month and year menus on the calendar. */
    captionLayout?: "dropdown" | "dropdown-months" | "dropdown-years" | "label";
    class?: string;
    /** Turns the field red for an error found outside, like a required check. */
    "aria-invalid"?: boolean;
    /** The id of the label; a label's `for` cannot point at this field. */
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
  } = $props();

  let open = $state(false);

  // bits-ui 2.18.1 empties every part as soon as its value turns undefined,
  // so clearing only the month would wipe the day and year too. The field
  // is kept on the last full date and holds its half-typed parts itself,
  // while `value` still turns undefined, so the page sees no date.
  let fieldValue = $state(untrack(() => value));
  // The last date this field handed to `value`, to tell it apart from a
  // date that the page or the calendar put there.
  let handedOut = untrack(() => value);

  $effect.pre(() => {
    const next = value;
    untrack(() => {
      if (next === handedOut) return;
      handedOut = next;
      fieldValue = next;
    });
  });

  function takeFromField(next: DateValue | undefined) {
    if (next) fieldValue = next;
    handedOut = next;
    value = next;
  }

  // The browser checks `required` only on a real input, never on a hidden
  // one or on the date parts. So an invisible input lies over the field,
  // holds the date as yyyy-mm-dd, and is what the browser checks, sends
  // and puts its "fill out this field" message on.
  let standIn = $state<HTMLInputElement | null>(null);
  const startValue = untrack(() => value);

  $effect(() => {
    if (standIn) standIn.value = value?.toString() ?? "";
  });

  // Rebuilding the field is the only way to empty the parts of a
  // half-typed date in bits-ui 2.18.1, since `value` is already undefined.
  let build = $state(0);

  function startOver(next: DateValue | undefined) {
    handedOut = next;
    fieldValue = next;
    value = next;
    build++;
    if (standIn) standIn.value = next?.toString() ?? "";
  }

  /** Empties all three parts, even those of a half-typed date. */
  export function clear() {
    startOver(undefined);
  }

  $effect(() => {
    const form = standIn?.form;
    if (!form) return;
    // The reset event comes before the browser resets the inputs, so wait
    // for that, then put the start date back in.
    const onReset = () => setTimeout(() => startOver(startValue));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  });

  // After the browser's message, the cursor is in the invisible input. A
  // key typed there goes on to the first empty part, so typing just works.
  function passKeyOn(e: KeyboardEvent) {
    if (e.key === "Tab" || e.key === "Enter" || e.ctrlKey || e.metaKey) {
      return;
    }
    e.preventDefault();
    const parts = [
      ...(standIn?.parentElement?.querySelectorAll<HTMLElement>(
        '[data-segment]:not([data-segment="literal"])',
      ) ?? []),
    ];
    const part =
      parts.find((p) => p.getAttribute("aria-valuetext") === "Empty") ??
      parts[0];
    if (!part) return;
    part.focus();
    part.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: e.key,
        code: e.code,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  const outOfRange = $derived(
    !!value &&
      ((!!minValue && value.compare(minValue) < 0) ||
        (!!maxValue && value.compare(maxValue) > 0)),
  );
</script>

<Popover.Root bind:open>
  {#key build}
    <DateField.Root
      bind:value={() => fieldValue, takeFromField}
      {disabled}
      {required}
      locale={LOCALE}
    >
      <InputGroup.Root
        class={cn(
          "has-[[data-segment]:focus,input:focus]:border-ring has-[[data-segment]:focus,input:focus]:ring-3 has-[[data-segment]:focus,input:focus]:ring-ring/50",
          className,
        )}
        data-disabled={disabled || undefined}
      >
        <DateField.Input
          {id}
          aria-invalid={ariaInvalid || outOfRange || undefined}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          data-slot="input-group-control"
          class="flex flex-1 items-center px-1 text-base tabular-nums select-none md:text-sm"
          onkeydowncapture={(e: KeyboardEvent) => {
            if (e.altKey && e.key === "ArrowDown") {
              e.preventDefault();
              e.stopPropagation();
              open = true;
            }
          }}
        >
          {#snippet children({ segments })}
            {#each segments as { part, value: text }, i (i)}
              {#if part === "literal"}
                <DateField.Segment {part} class="px-0.5 text-muted-foreground">
                  {text}
                </DateField.Segment>
              {:else}
                <DateField.Segment
                  {part}
                  class="rounded-sm px-1 py-0.5 outline-none transition-colors hover:text-foreground! hover:bg-muted-foreground/20 focus:bg-muted-foreground/20 focus:text-foreground aria-[valuetext=Empty]:text-muted-foreground in-aria-invalid:text-destructive data-disabled:hover:bg-transparent"
                >
                  {text}
                </DateField.Segment>
              {/if}
            {/each}
          {/snippet}
        </DateField.Input>
        <input
          bind:this={standIn}
          {name}
          {required}
          {disabled}
          tabindex="-1"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 opacity-0"
          onkeydown={passKeyOn}
          onbeforeinput={(e) => e.preventDefault()}
        />
        <InputGroup.Addon align="inline-end">
          <Popover.Trigger {disabled}>
            {#snippet child({ props })}
              <InputGroup.Button
                {...props}
                variant="ghost"
                size="icon-xs"
                aria-label="Open calendar"
              >
                <CalendarIcon />
              </InputGroup.Button>
            {/snippet}
          </Popover.Trigger>
        </InputGroup.Addon>
      </InputGroup.Root>
    </DateField.Root>
  {/key}
  <Popover.Content
    class="w-auto overflow-hidden p-0"
    align="end"
    alignOffset={-8}
    sideOffset={10}
  >
    <Calendar
      type="single"
      bind:value
      {minValue}
      {maxValue}
      {captionLayout}
      locale={LOCALE}
      onValueChange={() => (open = false)}
    />
  </Popover.Content>
</Popover.Root>
