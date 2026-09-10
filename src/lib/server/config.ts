/**
 * src/lib/server/config.ts
 *
 * Reading the `config` table.
 *
 * A setting is stored as text in `config_value` whatever it really is, so
 * every read has to turn that text back into the thing it stands for. Doing
 * that at the call site is how the same id ended up compared as a number in
 * one place and as a string in another. These functions do the conversion
 * once, driven by `CONFIG_VALUE_TYPES` in the schema, so a caller asking for
 * `org.gsu_unit` is handed a number without saying so.
 *
 * Nothing here throws. A setting that has never been filled in, one that was
 * cleared, and one holding text that cannot be read as its declared kind all
 * come back as null, because a caller can only do one thing about any of them
 * — treat the setting as unset and let the admin fill it in.
 */
import { db } from "$lib/server/db";
import {
  config,
  CONFIG_PARSERS,
  type ConfigKey,
  type ConfigValue,
} from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";

/** A whole settings row, with its value already parsed. */
export type ConfigRecord<K extends ConfigKey> = {
  key: K;
  value: ConfigValue<K> | null;
  updatedByFk: number | null;
  updatedAt: Date;
};

function parseConfigValue<K extends ConfigKey>(
  key: K,
  raw: string | null,
): ConfigValue<K> | null {
  if (raw === null || raw.trim() === "") return null;

  // The cast says what CONFIG_PARSERS already guarantees but TypeScript cannot
  // follow through a generic key: this key's parser returns this key's value.
  const parse = CONFIG_PARSERS[key] as (raw: string) => ConfigValue<K> | null;

  return parse(raw);
}

/**
 * The value of one setting, parsed, or null when it is unset.
 */
export async function getConfigValue<K extends ConfigKey>(
  key: K,
): Promise<ConfigValue<K> | null> {
  const [row] = await db
    .select({ value: config.configValue })
    .from(config)
    .where(eq(config.configKey, key))
    .limit(1);

  return parseConfigValue(key, row?.value ?? null);
}

/**
 * Several settings at once, as an object keyed by setting name. Reads them in
 * one query, for a screen showing more than one setting.
 */
export async function getConfigValues<K extends ConfigKey>(
  keys: readonly K[],
): Promise<{ [P in K]: ConfigValue<P> | null }> {
  const rows = keys.length
    ? await db
        .select({ key: config.configKey, value: config.configValue })
        .from(config)
        .where(inArray(config.configKey, [...keys]))
    : [];

  const values = {} as { [P in K]: ConfigValue<P> | null };
  for (const key of keys) {
    const raw = rows.find((row) => row.key === key)?.value ?? null;
    values[key] = parseConfigValue(key, raw);
  }

  return values;
}

/**
 * The whole row for one setting — the parsed value together with who last
 * changed it and when — or null when the setting has never been written.
 *
 * A row can exist with an empty value, so a null return and a record whose
 * `value` is null are different answers: the first means nobody has ever
 * touched the setting, the second that somebody cleared it.
 */
export async function getConfigRecord<K extends ConfigKey>(
  key: K,
): Promise<ConfigRecord<K> | null> {
  const [row] = await db
    .select()
    .from(config)
    .where(eq(config.configKey, key))
    .limit(1);

  if (!row) return null;

  return {
    key,
    value: parseConfigValue(key, row.configValue),
    updatedByFk: row.updatedByFk,
    updatedAt: row.updatedAt,
  };
}
