import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

// CodeMirror chrome themed to Ink & Paper via the --color-* tokens, so the
// editor follows any future token changes for free.
const chrome = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-ink-text)',
    fontSize: '12px',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    caretColor: 'var(--color-action)',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-action)' },
  '&.cm-focused': { outline: 'none' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--color-spark-tint)',
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-action-tint) 45%, transparent)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--color-spark-tint)' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-paper)',
    color: 'var(--color-faint)',
    borderRight: '1px solid var(--color-line)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-action-tint)',
    color: 'var(--color-soft)',
  },
  '.cm-foldGutter .cm-gutterElement': { cursor: 'pointer' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--color-action-tint)',
    border: '1px solid var(--color-line)',
    color: 'var(--color-soft)',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--color-spark-tint)', outline: '1px solid var(--color-spark)' },
  '.cm-lintRange-error': { textDecorationColor: 'var(--color-grid-error)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    color: 'var(--color-ink-text)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--color-action-tint)',
    color: 'var(--color-ink-text)',
  },
  // The find/replace panel, restyled from CM's default grey chrome.
  '.cm-panels': {
    backgroundColor: 'var(--color-paper)',
    color: 'var(--color-ink-text)',
    borderBottom: '1px solid var(--color-line)',
  },
  '.cm-panel.cm-search': { fontFamily: 'inherit' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    fontFamily: 'inherit',
    fontSize: '12px',
    borderRadius: '4px',
    border: '1px solid var(--color-line)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-ink-text)',
  },
  '.cm-panel.cm-search label': { fontSize: '11px', color: 'var(--color-soft)' },
  '.cm-searchMatch': { backgroundColor: 'var(--color-spark-tint)' },
  '.cm-searchMatch-selected': { backgroundColor: 'var(--color-grid-selection)' },
  // The inline color-swatch widgets (see colorSwatch.ts). The checkerboard
  // under the fill makes alpha in 8-digit hex values read as transparency.
  '.cm-color-swatch': {
    display: 'inline-block',
    width: '0.85em',
    height: '0.85em',
    padding: '0',
    borderRadius: '3px',
    border: '1px solid var(--color-line)',
    verticalAlign: 'middle',
    marginRight: '0.3em',
    cursor: 'pointer',
    overflow: 'hidden',
    backgroundColor: 'var(--color-surface)',
    backgroundImage: 'conic-gradient(var(--color-line) 25%, transparent 0 50%, var(--color-line) 0 75%, transparent 0)',
    backgroundSize: '6px 6px',
  },
  '.cm-color-swatch-fill': {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  // The color + alpha popover a swatch click opens (see colorSwatch.ts).
  '.cm-swatch-popover': {
    position: 'fixed',
    zIndex: '50',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-line)',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
  },
  '.cm-swatch-popover input[type="color"]': {
    width: '160px',
    height: '28px',
    padding: '0',
    border: '1px solid var(--color-line)',
    borderRadius: '4px',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
  },
  '.cm-swatch-popover-alpha': {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  '.cm-swatch-popover-alpha input[type="range"]': {
    flex: '1',
    minWidth: '0',
    accentColor: 'var(--color-action)',
    cursor: 'pointer',
  },
  '.cm-swatch-popover-alpha span': {
    fontSize: '11px',
    color: 'var(--color-soft)',
    minWidth: '32px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },
})

// JSON token colors from the same palette: keys carry the ink, strings the
// action hue, numbers/booleans the spark accent family.
const highlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--color-ink-text)', fontWeight: '600' },
  { tag: tags.string, color: 'var(--color-action-deep)' },
  { tag: tags.number, color: '#B07514' },
  { tag: tags.bool, color: '#B07514', fontWeight: '600' },
  { tag: tags.null, color: 'var(--color-faint)', fontStyle: 'italic' },
  { tag: tags.punctuation, color: 'var(--color-soft)' },
  { tag: tags.brace, color: 'var(--color-soft)' },
  { tag: tags.squareBracket, color: 'var(--color-soft)' },
  { tag: tags.invalid, color: 'var(--color-grid-error)' },
])

export function puzlerJsonTheme(): Extension[] {
  return [chrome, syntaxHighlighting(highlight)]
}
