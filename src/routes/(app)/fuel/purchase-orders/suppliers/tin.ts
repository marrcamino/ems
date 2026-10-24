/**
 * A Philippine TIN is 9 digits, usually followed by a branch code of 3
 * digits (older forms) or 5 digits (newer BIR forms).
 *
 * It is stored as digits only (123456789000), so the unique index compares
 * the number itself and cannot be dodged by typing it with spaces. The
 * spaces every 3 digits are only how it is shown and typed.
 */
export const TIN_MAX_DIGITS = 14;

/** The digits of a TIN, or null when it is not 9, 12, or 14 digits long. */
export function normalizeTin(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return [9, 12, TIN_MAX_DIGITS].includes(digits.length) ? digits : null;
}

/** Digits grouped by 3 with spaces, as typed and shown: 123 456 789 000. */
export function groupTin(raw: string): string {
  return raw.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** Shown under the field when `normalizeTin` cannot make sense of it. */
export const TIN_FORMAT_ERROR =
  "Enter the 9-digit TIN followed by its branch code, such as 123 456 789 000.";
