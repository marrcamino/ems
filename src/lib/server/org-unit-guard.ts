import { getConfigValues } from "$lib/server/config";
import { CONFIG_KEYS } from "$lib/server/db/schema";

// The settings whose value is an org unit id, each with the words an admin
// sees when that setting is what blocks a delete or a deactivation. A new
// setting pointing at an org unit belongs in this list and nowhere else.
const ORG_UNIT_SETTINGS = [CONFIG_KEYS.gsuUnit] as const;

const LABELS: Record<(typeof ORG_UNIT_SETTINGS)[number], string> = {
  [CONFIG_KEYS.gsuUnit]: "General Services Unit",
};

/**
 * The name of the setting that points at this org unit, or null when nothing
 * points at it.
 *
 * A setting stores the id as plain text, so the database cannot refuse the
 * delete on its own the way a foreign key would. That was a deliberate choice:
 * a foreign key would have protected deletion only, while marking a unit
 * inactive is an ordinary column change no foreign key can catch, so a check
 * in the program was needed regardless.
 *
 * The consequence is that the protection holds only while every path that
 * deletes or deactivates an org unit calls this. Keep it as the one function
 * both paths use rather than copying the query into each screen.
 */
export async function settingUsingOrgUnit(
  orgUnitPk: number,
): Promise<string | null> {
  // Read through src/lib/server/config.ts so the stored text is already a
  // number here. Comparing the raw text against a number is exactly the bug
  // that helper exists to remove.
  const values = await getConfigValues(ORG_UNIT_SETTINGS);

  for (const key of ORG_UNIT_SETTINGS) {
    if (values[key] === orgUnitPk) return LABELS[key];
  }

  return null;
}
