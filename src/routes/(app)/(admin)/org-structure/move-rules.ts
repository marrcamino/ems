import type { OrgUnit } from "$lib/types";

/** Which level a thing must sit under. The office has no parent. */
const PARENT_LEVEL: Record<
  Exclude<OrgUnit["level"], "office">,
  OrgUnit["level"]
> = {
  division: "office",
  section: "division",
  unit: "section",
};

export function parentLevelOf(level: OrgUnit["level"]) {
  return level === "office" ? null : PARENT_LEVEL[level];
}

/**
 * Decides whether `moving` is allowed to become a child of `target`.
 * Returns null when the move is fine, otherwise a sentence written for a
 * non-technical admin explaining why it isn't.
 *
 * This file deliberately has no imports beyond the types, so the browser and
 * the server can both use it and the rules can't be bypassed by dragging with
 * the developer tools open.
 *
 * Note that the level rule alone prevents a loop: a section's descendants are
 * only ever units, and a unit is never a division, so a box can never be
 * dropped into its own branch.
 */
export function moveRejectionReason(
  moving: OrgUnit,
  target: OrgUnit,
): string | null {
  if (moving.orgUnitPk === target.orgUnitPk) {
    return "You can't move something into itself.";
  }

  if (moving.level === "office") {
    return "The office sits at the top of the chart and can't be moved.";
  }

  if (moving.status === "inactive") {
    return `This ${moving.level} is inactive. Set it active again before moving it.`;
  }

  if (target.status === "inactive") {
    return `${target.orgUnitName} is inactive, so nothing can be moved into it.`;
  }

  const needed = PARENT_LEVEL[moving.level];
  if (target.level !== needed) {
    return `A ${moving.level} can only go under a ${needed}.`;
  }

  if (moving.parentFk === target.orgUnitPk) {
    return `${moving.orgUnitName} is already under ${target.orgUnitName}.`;
  }

  return null;
}
