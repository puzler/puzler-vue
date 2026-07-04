import { Decoration, ViewPlugin, WidgetType, EditorView } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import type { Extension, Range } from '@codemirror/state'
import { scanHexColors } from '@/utils/puzzleJson'

// Inline chip in front of every "#rrggbb" string wrapping a native
// <input type="color"> — the app-wide picker pattern. Picking a color
// dispatches a doc change that rewrites just the hex between the quotes.
class ColorSwatchWidget extends WidgetType {
  private readonly color: string
  // Range of the hex characters inside the quotes at decoration time.
  private readonly hexFrom: number
  private readonly hexTo: number

  constructor(color: string, hexFrom: number, hexTo: number) {
    super()
    this.color = color
    this.hexFrom = hexFrom
    this.hexTo = hexTo
  }

  override eq(other: ColorSwatchWidget): boolean {
    return other.color === this.color && other.hexFrom === this.hexFrom && other.hexTo === this.hexTo
  }

  override toDOM(view: EditorView): HTMLElement {
    const label = document.createElement('label')
    label.className = 'cm-color-swatch'
    label.style.backgroundColor = this.color
    const input = document.createElement('input')
    input.type = 'color'
    input.value = this.color.toLowerCase()
    input.addEventListener('change', () => {
      view.dispatch({ changes: { from: this.hexFrom, to: this.hexTo, insert: input.value } })
    })
    label.appendChild(input)
    return label
  }

  // Let clicks reach the native input instead of moving the CM selection.
  override ignoreEvent(): boolean {
    return true
  }
}

function buildSwatches(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = []
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    for (const match of scanHexColors(text, from)) {
      // match spans the quotes; the hex sits one character inside either end.
      const widget = new ColorSwatchWidget(match.color, match.from + 1, match.to - 1)
      decorations.push(Decoration.widget({ widget, side: 1 }).range(match.from + 1))
    }
  }
  return Decoration.set(decorations)
}

export function colorSwatchExtension(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildSwatches(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildSwatches(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  )
}
