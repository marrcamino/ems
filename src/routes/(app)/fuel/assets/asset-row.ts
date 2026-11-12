import type { Asset, AssetType } from "@/types";

/** An asset as the page holds it: the row, plus the name of its type. */
export type AssetRow = Asset & Pick<AssetType, "assetTypeName">;

export const FUEL_TYPE_CHOICES = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
] as const;

export function fuelTypeLabel(value: Asset["fuelType"]) {
  return FUEL_TYPE_CHOICES.find((c) => c.value === value)?.label ?? value;
}
