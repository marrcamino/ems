/**
 * scripts/lib/cli.ts
 *
 * Shared @clack/prompts helper for the offline bootstrap/recovery scripts.
 */

import * as p from "@clack/prompts";

/**
 * Bail out cleanly on Ctrl+C / Esc at any prompt.
 * `cancelMessage` is script-specific (e.g. "Admin bootstrap cancelled...").
 */
export function bailIfCancelled<T>(
  value: T | symbol,
  cancelMessage: string,
): T {
  if (p.isCancel(value)) {
    p.cancel(cancelMessage);
    process.exit(0);
  }
  return value as T;
}
