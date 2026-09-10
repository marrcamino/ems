import type { AssetType } from "@/types";

export type MeterType = AssetType["meterType"];

/**
 * The wording every screen uses for a meter type. Written for somebody who
 * has never heard the term "hour meter" — the description says where to look
 * on the machine, not what the value means to the database.
 */
export const METER_TYPE_CHOICES: {
  value: MeterType;
  label: string;
  description: string;
}[] = [
  {
    value: "odometer",
    label: "Odometer",
    description:
      "Shows total kilometers travelled. For motorcycles, pick-ups, and anything that runs on the road",
  },
  {
    value: "hour_meter",
    label: "Hour meter",
    description:
      "Shows how many hours the engine has run. Usually a small counter on the generator panel, near the voltage gauge.",
  },
  {
    value: "none",
    label: "No meter",
    description:
      "Nothing to read. For grass cutters and chainsaws. Only the liters issued are recorded.",
  },
];

export function meterTypeLabel(value: MeterType) {
  return METER_TYPE_CHOICES.find((c) => c.value === value)?.label ?? value;
}
