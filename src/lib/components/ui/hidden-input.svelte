<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    required?: boolean;
    name?: string;
    value?: any;
    disabled?: boolean;
    onFormReset?: () => void;
  }

  let {
    required = $bindable(undefined),
    name = $bindable(undefined),
    disabled = $bindable(undefined),
    value,
    onFormReset,
  }: Props = $props();

  let inputEl: HTMLInputElement;

  onMount(() => {
    const form = inputEl.form;
    if (!form) return;

    const handleReset = () => {
      onFormReset?.();
    };

    form.addEventListener("reset", handleReset);

    return () => form.removeEventListener("reset", handleReset);
  });
</script>

<input
  {required}
  {name}
  {value}
  {disabled}
  bind:this={inputEl}
  aria-hidden="true"
  tabindex="-1"
  autocomplete="off"
  style="position: absolute; width: 1px; height: 1px; padding: 0px; margin: -1px; overflow: hidden; clip: rect(0px, 0px, 0px, 0px); white-space: nowrap; border-width: 0px; transform: translateX(-100%) translateY(8px);"
/>
