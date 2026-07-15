// Helpers for the Discord-style ||spoiler|| syntax in comment bodies. The
// server (Comment#segments) is the authority on parsing and redaction; this
// module only powers the composer affordances (wrap-selection button and the
// local hint about what will be hidden).

export const SPOILER_DELIMITER = '||'

export interface SpoilerWrapResult {
  text: string
  // Caret position after wrapping: after the closing delimiter for a wrapped
  // selection, or between the delimiters when nothing was selected.
  caret: number
}

// Wrap the [start, end) selection of `text` in spoiler delimiters. With an
// empty selection, insert an empty pair and park the caret inside it.
export function wrapSelectionInSpoiler(text: string, start: number, end: number): SpoilerWrapResult {
  const before = text.slice(0, start)
  const selected = text.slice(start, end)
  const after = text.slice(end)
  const wrapped = `${before}${SPOILER_DELIMITER}${selected}${SPOILER_DELIMITER}${after}`
  const caret = selected
    ? start + SPOILER_DELIMITER.length * 2 + selected.length
    : start + SPOILER_DELIMITER.length
  return { text: wrapped, caret }
}

// Whether the body contains at least one complete ||...|| section. Mirrors the
// server rule: an unclosed trailing delimiter is literal text, not a spoiler.
export function hasSpoilerSections(text: string): boolean {
  return text.split(SPOILER_DELIMITER).length >= 3
}
