<script lang="ts" module>
  export interface RadioTab<T extends string = string> {
    value: T;
    label: string;
    /** Shown in a pill after the label, when given. */
    count?: number;
  }
</script>

<!--
  @component
  Radio buttons that look like tabs: one is always picked, and the arrow keys
  move between them as with any radio group. The picked tab's underline
  slides and stretches to the next one.

  ```svelte
  <RadioTabs
    legend="Status"
    tabs={[
      { value: "all", label: "All", count: 100 },
      { value: "out", label: "Out", count: 2 },
    ]}
    bind:value={statusTab}
  />
  ```
-->
<script lang="ts" generics="T extends string">
  import { dataAttr } from "@/utils";

  interface Props {
    tabs: RadioTab<T>[];
    value: T;
    legend: string;
    class?: string;
  }

  let { tabs, value = $bindable(), legend, class: className }: Props = $props();

  const name = $props.id();

  let fieldset = $state<HTMLFieldSetElement>();
  let start = $state(0);
  let end = $state(0);
  let rowWidth = $state(0);
  let direction = $state<"left" | "right">("right");
  /** Off until the first frame, so the underline does not slide in on load. */
  let animated = $state(false);

  function measure() {
    const tab = fieldset?.querySelector<HTMLElement>("label:has(:checked)");
    if (!fieldset || !tab) return;
    if (tab.offsetLeft !== start) {
      direction = tab.offsetLeft > start ? "right" : "left";
    }
    start = tab.offsetLeft;
    end = tab.offsetLeft + tab.offsetWidth;
    rowWidth = fieldset.scrollWidth;
  }

  $effect(() => {
    void value;
    void tabs;
    measure();
  });

  // The font loading and window resizes also move the tabs.
  $effect(() => {
    if (!fieldset) return;
    const observer = new ResizeObserver(measure);
    for (const tab of fieldset.querySelectorAll("label")) observer.observe(tab);
    const frame = requestAnimationFrame(() => (animated = true));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  });
</script>

<!--
  The padding leaves room for the focus ring; the negative margin cancels it.
  The line under the tabs is a background, not a border, so the scrolling box
  does not clip the underline that sits on it.
-->
<fieldset
  bind:this={fieldset}
  class={[
    "relative -mx-1 flex gap-5 overflow-x-hidden px-1 pt-1 [background:linear-gradient(var(--border),var(--border))_center_bottom/calc(100%-0.5rem)_1px_no-repeat]",
    className,
  ]}
>
  <legend class="sr-only">{legend}</legend>
  {#each tabs as tab (tab.value)}
    <label
      data-with-count={dataAttr(tab.count)}
      class="relative flex data-with-count:pl-1 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm pb-2.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground has-checked:text-foreground has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
    >
      <input
        type="radio"
        class="sr-only"
        {name}
        value={tab.value}
        bind:group={value}
      />
      {tab.label}
      {#if tab.count !== undefined}
        <span
          class="rounded-full bg-muted px-1.5 py-px text-xs text-muted-foreground tabular-nums"
        >
          {tab.count.toLocaleString()}
        </span>
      {/if}
    </label>
  {/each}

  <!--
    One full-width line, clipped to the picked tab. The leading end moves
    faster than the trailing end, so the line stretches as it travels.
  -->
  <span
    aria-hidden="true"
    class={[
      "tab-indicator pointer-events-none absolute bottom-0 inset-x-0 h-0.5 bg-primary",
      animated &&
        "ease-out-strong [transition-property:--tab-start,--tab-end] motion-reduce:transition-none",
    ]}
    data-direction={direction}
    style:width="{rowWidth}px"
    style:--tab-start="{start}px"
    style:--tab-end="{end}px"
  ></span>
</fieldset>

<style>
  /* Registered so they animate; unregistered custom properties jump. */
  @property --tab-start {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
  }
  @property --tab-end {
    syntax: "<length>";
    inherits: false;
    initial-value: 0px;
  }

  .tab-indicator {
    clip-path: inset(0 calc(100% - var(--tab-end)) 0 var(--tab-start));
    transition-duration: 280ms, 180ms;
  }
  .tab-indicator[data-direction="left"] {
    transition-duration: 180ms, 280ms;
  }
</style>
