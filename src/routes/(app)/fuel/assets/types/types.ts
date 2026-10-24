import type { AssetType } from "@/types";

/** How many assets are recorded as one type, and a few of them by name. */
export type TypeUsage = { count: number; sample: string[] };

/**
 * An asset type with how many assets are recorded under it. The count is
 * what decides whether Delete offers to delete or offers to deactivate it.
 *
 * The `usage` the page loads with goes stale as soon as an asset is added
 * or deleted on the same page, so the asset types dialog recounts from the
 * assets on screen when Delete is pressed, with `countUsage` below.
 */
export type AssetTypeRow = AssetType & { usage: TypeUsage };

/** How many assets are named in full before the message falls back to a count. */
export const NAMES_SHOWN = 5;

/**
 * Groups assets by their type: how many each type has, and the first few
 * names for the delete confirmation to quote. Used by the server when the
 * page loads and when a delete is checked, and by the asset types dialog
 * from the assets currently on screen, so both count the same way.
 * Pass the assets already sorted by name.
 */
export function countUsage(
  assets: { assetTypeFk: number; assetName: string }[],
): Map<number, TypeUsage> {
  const usage = new Map<number, TypeUsage>();
  for (const { assetTypeFk, assetName } of assets) {
    const entry = usage.get(assetTypeFk) ?? { count: 0, sample: [] };
    entry.count += 1;
    if (entry.sample.length < NAMES_SHOWN) entry.sample.push(assetName);
    usage.set(assetTypeFk, entry);
  }
  return usage;
}

/**
 * Why a type in use cannot be deleted. A count, not the asset names: the
 * admin only needs to know that it is in use to choose Deactivate, and a
 * list of names made the dialog too long to read at a glance.
 *
 * Shared by the confirmation dialog and the server, because the two say the
 * same sentence at different moments — the dialog from the assets on screen,
 * the server from a fresh count if that has since moved on — and they should
 * not drift into two different wordings.
 */
export function inUseMessage(assetTypeName: string, usage: TypeUsage) {
  const assets =
    usage.count === 1 ? "1 asset still uses" : `${usage.count} assets still use`;
  return `${assetTypeName} can't be deleted because ${assets} it.`;
}
