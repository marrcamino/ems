<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import { LOCALE } from "$lib/utils/format-number.js";
  import { cn } from "$lib/utils/index.js";
  import { untrack, type ComponentProps } from "svelte";

  /**
   * A field for a quantity or an amount that puts in the commas as it is
   * typed: 1234567.5 shows as 1,234,567.5. `value` is the plain number, or
   * null while the field is empty; the commas are only in what is shown.
   *
   *   <NumberInput bind:value={unitCost} wholeDigits={3} padDecimals />
   *
   * Only digits and one period go in. Anything else typed does nothing, and
   * pasted text keeps only its number, so ₱1,234.50 pastes as 1,234.50.
   * A decimal past `decimals` is dropped (65.555 stays 65.55), and a whole
   * digit past `wholeDigits` is refused, so the field stays as it was.
   *
   * Inside an InputGroup, set `grouped` so the field takes the group's look.
   */
  let {
    value = $bindable(null),
    wholeDigits = 9,
    decimals = 2,
    padDecimals = false,
    grouped = false,
    ref = $bindable(null),
    class: className,
    oninput,
    onkeydown,
    onblur,
    ...restProps
  }: Omit<ComponentProps<typeof Input>, "value" | "type" | "files" | "ref"> & {
    value?: number | null;
    ref?: HTMLInputElement | null;
    /** Most digits before the period: 3 allows up to 999.99. */
    wholeDigits?: number;
    /** Most digits after the period. 0 allows no period at all. */
    decimals?: number;
    /** On leaving the field, fill in the decimals: 65.5 becomes 65.50. */
    padDecimals?: boolean;
    grouped?: boolean;
  } = $props();

  /** The digits and period as written, with commas. */
  let text = $state(untrack(() => show(value, padDecimals)));

  function show(n: number | null, pad: boolean) {
    if (n === null || !Number.isFinite(n)) return "";
    return new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: pad ? decimals : 0,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  function toNumber(t: string) {
    const bare = t.replaceAll(",", "");
    return bare === "" ? null : Number(bare);
  }

  // A value set from outside (another field worked it out, or the form was
  // cleared) is shown. A value that already matches what is shown is left
  // alone, so "12." or "65.50" are not rewritten while they are typed.
  $effect(() => {
    const next = value;
    untrack(() => {
      if (toNumber(text) !== next) text = show(next, padDecimals);
    });
  });

  // The field's text is set here rather than bound, because typing has to
  // rewrite it and put the cursor back in the right place.
  $effect(() => {
    if (ref && ref.value !== text) ref.value = text;
  });

  /**
   * What was typed or pasted, rewritten with its commas, or null when it is
   * refused: a second period, a period when `decimals` is 0, or too many
   * whole digits. `before` is how many digits and periods sit before the
   * cursor, so the cursor can be put back after the same one.
   */
  function rewrite(raw: string, before: number) {
    const bare = raw.replace(/[^\d.]/g, "");
    const periods = bare.split(".").length - 1;
    if (periods > (decimals > 0 ? 1 : 0)) return null;

    let [whole, fraction] = bare.split(".");
    // 007 is 7. The zeros go from the front, so the cursor moves back by
    // as many as went.
    const trimmed = whole.replace(/^0+(?=\d)/, "");
    before = Math.max(0, before - (whole.length - trimmed.length));
    whole = trimmed;
    if (whole.length > wholeDigits) return null;

    // A period typed first reads as 0.
    if (whole === "" && fraction !== undefined) {
      whole = "0";
      if (before > 0) before++;
    }

    let result = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (fraction !== undefined) result += "." + fraction.slice(0, decimals);
    return { text: result, before };
  }

  /** The position just after the `count`-th digit or period in `t`. */
  function cursorAfter(t: string, count: number) {
    if (count === 0) return 0;
    let seen = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] !== "," && ++seen === count) return i + 1;
    }
    return t.length;
  }

  function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
    const el = event.currentTarget;
    const raw = el.value;
    const cursor = el.selectionStart ?? raw.length;
    const before = raw.slice(0, cursor).replace(/[^\d.]/g, "").length;
    const next = rewrite(raw, before);

    if (next === null) {
      // Refused: back to what it held, with the cursor where it was.
      const back = Math.max(0, cursor - (raw.length - text.length));
      el.value = text;
      el.setSelectionRange(back, back);
      return;
    }

    text = next.text;
    el.value = text;
    const at = cursorAfter(text, next.before);
    el.setSelectionRange(at, at);
    value = toNumber(text);
    oninput?.(event);
  }

  // Backspace just after a comma, or Delete just before one, would remove
  // only the comma, which the field then puts straight back. The cursor is
  // stepped over the comma first, so the digit beside it goes instead.
  function handleKeydown(
    event: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) {
    const el = event.currentTarget;
    const at = el.selectionStart;
    if (at !== null && at === el.selectionEnd) {
      if (event.key === "Backspace" && el.value[at - 1] === ",") {
        el.setSelectionRange(at - 1, at - 1);
      } else if (event.key === "Delete" && el.value[at] === ",") {
        el.setSelectionRange(at + 1, at + 1);
      }
    }
    onkeydown?.(event);
  }

  function handleBlur(event: FocusEvent & { currentTarget: HTMLInputElement }) {
    if (padDecimals && value !== null) text = show(value, true);
    onblur?.(event);
  }

  const Field = $derived(grouped ? InputGroup.Input : Input);
</script>

<Field
  bind:ref
  type="text"
  inputmode="decimal"
  autocomplete="off"
  autocorrect="off"
  spellcheck={false}
  class={cn("tabular-nums", className)}
  oninput={handleInput}
  onkeydown={handleKeydown}
  onblur={handleBlur}
  {...restProps}
/>
