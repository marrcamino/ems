<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";

  type Field = "unitCost" | "liters" | "amount";

  const FIELDS: Field[] = ["unitCost", "liters", "amount"];
  const FIELD_LABEL: Record<Field, string> = {
    unitCost: "unit cost",
    liters: "actual liters",
    amount: "total amount",
  };

  // Raw strings so partial typing like "2." isn't wiped on re-render
  let v = $state<Record<Field, string>>({
    unitCost: "",
    liters: "",
    amount: "",
  });

  // Last two fields the user typed in, most recent first.
  // The third field is the one that gets computed.
  let edited = $state<Field[]>([]);

  const computed = $derived<Field | null>(
    edited.length === 2
      ? (FIELDS.find((f) => !edited.includes(f)) ?? null)
      : null,
  );

  const round = (n: number, decimals: number) => {
    const f = 10 ** decimals;
    return Math.round((n + Number.EPSILON) * f) / f;
  };

  const toNum = (s: string) => {
    const n = Number(s);
    return s.trim() === "" || !Number.isFinite(n) ? null : n;
  };

  // Only ever overwrites the computed field, never one the user is typing in
  function recompute(target: Field | null) {
    if (!target) return;
    const cost = toNum(v.unitCost);
    const liters = toNum(v.liters);
    const amount = toNum(v.amount);

    if (target === "amount") {
      v.amount =
        cost !== null && liters !== null
          ? round(liters * cost, 2).toFixed(2)
          : "";
    } else if (target === "liters") {
      v.liters =
        cost !== null && cost > 0 && amount !== null
          ? round(amount / cost, 3).toFixed(3)
          : "";
    } else {
      v.unitCost =
        liters !== null && liters > 0 && amount !== null
          ? round(amount / liters, 2).toFixed(2)
          : "";
    }
  }

  function onInput(field: Field, value: string) {
    v[field] = value;
    edited = [field, ...edited.filter((f) => f !== field)].slice(0, 2);
    recompute(
      FIELDS.find((f) => edited.length === 2 && !edited.includes(f)) ?? null,
    );
  }

  // Keeps unit cost, clears only liters and amount
  function clearQuantities() {
    v.liters = "";
    v.amount = "";
    edited = v.unitCost.trim() ? ["unitCost"] : [];
  }

  function reset() {
    v = { unitCost: "", liters: "", amount: "" };
    edited = [];
  }

  type Given = { label: string; value: string };

  // Inverse: feed the computed value back in and calculate one of the original inputs
  const inverse = $derived.by(() => {
    const c = toNum(v.unitCost);
    const l = toNum(v.liters);
    const a = toNum(v.amount);
    if (!computed || c === null || l === null || a === null) return null;

    if (computed === "amount") {
      // Forward: cost × liters → amount. Inverse: amount ÷ cost → liters
      if (c <= 0) return null;
      const result = round(a / c, 3);
      return {
        given: [
          { label: "Unit cost (₱/L)", value: c.toFixed(2) },
          { label: "Total amount (₱)", value: a.toFixed(2) },
        ] as Given[],
        outputLabel: "Actual liters",
        outputValue: result.toFixed(3),
        originalValue: l.toFixed(3),
        diff: round(result - l, 3),
        unit: "L",
        decimals: 3,
      };
    }

    if (computed === "liters") {
      // Forward: amount ÷ cost → liters. Inverse: liters × cost → amount
      const result = round(l * c, 2);
      return {
        given: [
          { label: "Unit cost (₱/L)", value: c.toFixed(2) },
          { label: "Actual liters", value: l.toFixed(3) },
        ] as Given[],
        outputLabel: "Total amount (₱)",
        outputValue: result.toFixed(2),
        originalValue: a.toFixed(2),
        diff: round(result - a, 2),
        unit: "₱",
        decimals: 2,
      };
    }

    // Forward: amount ÷ liters → cost. Inverse: cost × liters → amount
    const result = round(c * l, 2);
    return {
      given: [
        { label: "Unit cost (₱/L)", value: c.toFixed(2) },
        { label: "Actual liters", value: l.toFixed(3) },
      ] as Given[],
      outputLabel: "Total amount (₱)",
      outputValue: result.toFixed(2),
      originalValue: a.toFixed(2),
      diff: round(result - a, 2),
      unit: "₱",
      decimals: 2,
    };
  });
</script>

{#snippet computedTag(field: Field)}
  {#if computed === field}
    <span class="text-muted-foreground text-xs font-normal">(computed)</span>
  {/if}
{/snippet}

<div class="grid w-full max-w-3xl gap-4 md:grid-cols-2">
  <Card.Root class="h-max">
    <Card.Header>
      <Card.Title>Fuel withdrawal</Card.Title>
      <Card.Description
        >Fill in any two fields; the third is computed.</Card.Description
      >
    </Card.Header>

    <Card.Content class="space-y-4">
      <div class="space-y-1.5">
        <Label for="unit-cost"
          >Unit cost (₱/L) {@render computedTag("unitCost")}</Label
        >
        <Input
          id="unit-cost"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="97.25"
          value={v.unitCost}
          oninput={(e) => onInput("unitCost", e.currentTarget.value)}
          class={computed === "unitCost" ? "bg-muted" : ""}
        />
      </div>

      <div class="space-y-1.5">
        <Label for="liters">Actual liters {@render computedTag("liters")}</Label
        >
        <Input
          id="liters"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.001"
          placeholder="2.500"
          value={v.liters}
          oninput={(e) => onInput("liters", e.currentTarget.value)}
          class={computed === "liters" ? "bg-muted" : ""}
        />
      </div>

      <div class="space-y-1.5">
        <Label for="amount"
          >Total amount (₱) {@render computedTag("amount")}</Label
        >
        <Input
          id="amount"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          placeholder="243.13"
          value={v.amount}
          oninput={(e) => onInput("amount", e.currentTarget.value)}
          class={computed === "amount" ? "bg-muted" : ""}
        />
      </div>
    </Card.Content>

    <Card.Footer class="flex items-center justify-between gap-2">
      <span class="text-muted-foreground text-xs">
        {computed
          ? `Computing: ${FIELD_LABEL[computed]}`
          : "Enter any two fields"}
      </span>
      <div class="flex gap-2">
        <Button variant="ghost" onclick={clearQuantities}
          >Clear L &amp; ₱</Button
        >
        <Button variant="outline" onclick={reset}>Reset all</Button>
      </div>
    </Card.Footer>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Inverse check</Card.Title>
      <Card.Description>
        Feeds the computed value back in to recover an original input.
      </Card.Description>
    </Card.Header>

    <Card.Content class="space-y-4">
      {#if inverse}
        {#each inverse.given as g, i (g.label)}
          <div class="space-y-1.5">
            <Label for={`inv-given-${i}`}>
              {g.label}
              <span class="text-muted-foreground text-xs font-normal"
                >(from left)</span
              >
            </Label>
            <Input
              id={`inv-given-${i}`}
              value={g.value}
              readonly
              class="bg-muted"
            />
          </div>
        {/each}

        <div class="space-y-1.5">
          <Label for="inv-output">
            {inverse.outputLabel}
            <span class="text-muted-foreground text-xs font-normal"
              >(inverted)</span
            >
          </Label>
          <Input
            id="inv-output"
            value={inverse.outputValue}
            readonly
            class="bg-muted"
          />
        </div>

        <div class="rounded-md border p-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Original entered</span>
            <span>{inverse.originalValue}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Difference</span>
            <span
              class={inverse.diff === 0 ? "text-green-600" : "text-amber-600"}
            >
              {inverse.diff === 0
                ? "Exact match"
                : `${inverse.diff > 0 ? "+" : ""}${inverse.diff.toFixed(inverse.decimals)} ${inverse.unit}`}
            </span>
          </div>
        </div>
      {:else}
        <p class="text-muted-foreground text-sm">
          Fill in any two fields on the left.
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
