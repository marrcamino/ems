import type { Asset, AssetType } from "@/types";

/**
 * An asset as the page holds it: the row, plus the name and meter of its
 * type. The meter is carried because the plate rule and the "reads an
 * odometer" hint both depend on it, and the type is not stored on the asset.
 */
export type AssetRow = Asset & Pick<AssetType, "assetTypeName" | "meterType">;

export const FUEL_TYPE_CHOICES = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
] as const;

export function fuelTypeLabel(value: Asset["fuelType"]) {
  return FUEL_TYPE_CHOICES.find((c) => c.value === value)?.label ?? value;
}
