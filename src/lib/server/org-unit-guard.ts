import { db } from "$lib/server/db";
import { config, CONFIG_KEYS, type ConfigKey } from "$lib/server/db/schema";
import { inArray } from "drizzle-orm";

// The settings whose value is an org unit id, each with the words an admin
// sees when that setting is what blocks a delete or a deactivation. A new
// setting pointing at an org unit belongs in this list and nowhere else.
const ORG_UNIT_SETTINGS: { key: ConfigKey; label: string }[] = [
  { key: CONFIG_KEYS.gsuUnit, label: "General Services Unit" },
];

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
  const rows = await db
    .select({ key: config.configKey, value: config.configValue })
    .from(config)
    .where(
      inArray(
        config.configKey,
        ORG_UNIT_SETTINGS.map(({ key }) => key),
      ),
    );

  const match = rows.find((row) => Number(row.value) === orgUnitPk);
  if (!match) return null;

  return (
    ORG_UNIT_SETTINGS.find(({ key }) => key === match.key)?.label ?? match.key
  );
}
