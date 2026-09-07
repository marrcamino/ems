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

/**
 * How wide a printed message may be, in characters.
 *
 * `@clack/prompts` draws a box sized to the longest line it is given and puts
 * a gutter down the left of it. A line wider than the terminal window is then
 * broken by the terminal at whatever point it runs out of room, and the box
 * splits open. Sixty characters leaves room for that gutter inside a standard
 * eighty-column window.
 */
export const MESSAGE_WIDTH = 60;

/** The invisible colour codes picocolors puts around text. */
const COLOUR_CODE = /\u001B\[[0-9;]*m/g;

/** How wide a piece of text looks on screen, colour codes not counted. */
function visibleLength(text: string): number {
  return text.replace(COLOUR_CODE, "").length;
}

/**
 * Breaks a message into lines no wider than `width`, so the box drawn around
 * it keeps its shape.
 *
 * Line breaks already written into the text are kept, which is how a message
 * is split into paragraphs. Everything else is filled in greedily, word by
 * word. A single word longer than the width — a long username, say — is left
 * on a line of its own rather than cut in half.
 */
export function wrap(text: string, width: number = MESSAGE_WIDTH): string {
  return text
    .split("\n")
    .map((paragraph) => wrapParagraph(paragraph, width))
    .join("\n");
}

function wrapParagraph(paragraph: string, width: number): string {
  const words = paragraph.split(/ +/).filter((word) => word.length > 0);
  if (words.length === 0) return "";

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (line === "") {
      line = word;
    } else if (visibleLength(line) + 1 + visibleLength(word) <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }

  lines.push(line);
  return lines.join("\n");
}
