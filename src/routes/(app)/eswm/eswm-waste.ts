/**
 * The two kinds of waste that the office weighs each month, and the types of
 * each, in the order of its workbook, sheet "ESWM" (feature doc, "The
 * office's workbook").
 */

export type WasteSource = "coastal" | "office";
export type WasteType =
  | "recyclable"
  | "residual"
  | "non_biodegradable"
  | "biodegradable"
  | "special";

/** A type's kilos for a month; a type that was not weighed is missing. */
export type BlockKilos = Partial<Record<WasteType, number>>;
export type MonthWaste = Record<WasteSource, BlockKilos>;

export const WASTE_SOURCES: WasteSource[] = ["coastal", "office"];

export const SOURCE_LABEL: Record<WasteSource, string> = {
  coastal: "Coastal cleanup",
  office: "Office waste",
};

export const WASTE_LABEL: Record<WasteType, string> = {
  recyclable: "Recyclable",
  residual: "Residual",
  non_biodegradable: "Non-biodegradable",
  biodegradable: "Biodegradable",
  special: "Special",
};

/** The workbook gives examples for the office's own bins only. */
type WasteKind = { type: WasteType; examples?: string };

export const WASTE_TYPES: Record<WasteSource, WasteKind[]> = {
  coastal: [
    { type: "recyclable" },
    { type: "residual" },
    { type: "non_biodegradable" },
    { type: "biodegradable" },
  ],
  office: [
    {
      type: "non_biodegradable",
      examples:
        "Dile malata: wrappers, plastics, plastic bottles, cellophane, cans, tins, metals",
    },
    {
      type: "biodegradable",
      examples: "Malata: paper, boxes, food leftovers",
    },
    {
      type: "residual",
      examples:
        "Sanitary napkins, tissue paper, dirty cellophane, broken ceramics, laminated cups, broken glass, glass bottles",
    },
    {
      type: "special",
      examples:
        "Busted bulbs, paint, thinner, disinfectant, sanitizer, insecticides, pesticides, their containers, surgical masks and gloves",
    },
  ],
};

export function isWasteSource(value: unknown): value is WasteSource {
  return value === "coastal" || value === "office";
}

export function emptyMonthWaste(): MonthWaste {
  return { coastal: {}, office: {} };
}

/** The block's kilos, or null when none of its types was weighed. */
export function blockTotal(block: BlockKilos): number | null {
  const values = Object.values(block);
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0);
}

/** Both blocks together, or null when nothing was weighed in the month. */
export function monthTotal(waste: MonthWaste): number | null {
  const parts = WASTE_SOURCES.map((s) => blockTotal(waste[s])).filter(
    (v) => v !== null,
  );
  return parts.length === 0 ? null : parts.reduce((sum, v) => sum + v, 0);
}

/**
 * The colour of each block on the Summary: the dataviz skill's first two
 * checked colours, for light and dark mode.
 */
const SOURCE_COLOURS: Record<WasteSource, [string, string]> = {
  coastal: ["#2a78d6", "#3987e5"],
  office: ["#eb6834", "#d95926"],
};

/** Sets `--light` and `--dark` for `bg-(--light) dark:bg-(--dark)`. */
export function sourceColour(source: WasteSource) {
  const [light, dark] = SOURCE_COLOURS[source];
  return `--light: ${light}; --dark: ${dark}`;
}
