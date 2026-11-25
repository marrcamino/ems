/**
 * The bond paper sizes an office can record. A fixed list rather than a
 * table, because these are the only sizes offices print documents on
 * (paper-consumption.md, "What EMS does"). Adding one means adding it here;
 * the database column takes its values from this list.
 */
export const PAPER_SIZES = [
  { value: "a4", label: "A4", measure: "210 × 297 mm" },
  { value: "short", label: "Short", measure: "216 × 279 mm" },
  { value: "long", label: "Long", measure: "216 × 330 mm" },
  { value: "legal", label: "Legal", measure: "216 × 356 mm" },
] as const;

export type PaperSize = (typeof PAPER_SIZES)[number]["value"];

export const PAPER_SIZE_VALUES = PAPER_SIZES.map((s) => s.value) as [
  PaperSize,
  ...PaperSize[],
];

export function paperSizeLabel(value: PaperSize) {
  return PAPER_SIZES.find((s) => s.value === value)?.label ?? value;
}

export function isPaperSize(value: unknown): value is PaperSize {
  return PAPER_SIZE_VALUES.includes(value as PaperSize);
}
