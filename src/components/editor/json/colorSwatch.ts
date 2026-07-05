import { Decoration, ViewPlugin, WidgetType, EditorView } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import type { Extension, Range } from '@codemirror/state'
import { scanHexColors } from '@/utils/puzzleJson'

// Hex/alpha math for the popover. The native color input only speaks
// "#rrggbb", so an "#rrggbbaa" value splits into the 6-digit part plus a
// 0-100 alpha percentage; composing collapses full opacity back to the
// 6-digit form so untouched colors keep their short spelling.
export function splitHexAlpha(color: string): { rgb: string; alphaPct: number } {
  const rgb = color.slice(0, 7).toLowerCase()
  if (color.length < 9) return { rgb, alphaPct: 100 }
  return { rgb, alphaPct: Math.round((parseInt(color.slice(7, 9), 16) / 255) * 100) }
}

export function composeHexAlpha(rgb: string, alphaPct: number): string {
  const pct = Math.min(100, Math.max(0, Math.round(alphaPct)))
  if (pct === 100) return rgb.toLowerCase()
  return rgb.toLowerCase() + Math.round((pct / 100) * 255).toString(16).padStart(2, '0')
}

const HEX_VALUE_RE = /^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/

// One popover shared by every editor instance: a native color input plus an
// alpha slider, anchored to the swatch that opened it. Commits happen on
// `change` only (picker close, slider release) so the decoration set is not
// rebuilt under the open popover mid-drag; the tracked hex range is remapped
// through every doc change so a commit after other edits still rewrites the
// right characters.
class SwatchPopover {
  private el: HTMLElement | null = null
  private anchor: HTMLElement | null = null
  private view: EditorView | null = null
  private hexFrom = 0
  private hexTo = 0
  private colorInput: HTMLInputElement | null = null
  private alphaInput: HTMLInputElement | null = null

  toggle(view: EditorView, anchor: HTMLElement, hexFrom: number, hexTo: number, color: string) {
    if (this.el && this.view === view && this.hexFrom === hexFrom) {
      this.close()
      return
    }
    this.close()
    this.view = view
    this.anchor = anchor
    this.hexFrom = hexFrom
    this.hexTo = hexTo

    const { rgb, alphaPct } = splitHexAlpha(color)

    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.value = rgb
    colorInput.setAttribute('aria-label', 'Color')
    colorInput.addEventListener('change', this.commit)

    const alphaInput = document.createElement('input')
    alphaInput.type = 'range'
    alphaInput.min = '0'
    alphaInput.max = '100'
    alphaInput.value = String(alphaPct)
    alphaInput.setAttribute('aria-label', 'Opacity')
    const readout = document.createElement('span')
    readout.textContent = `${alphaPct}%`
    alphaInput.addEventListener('input', () => {
      readout.textContent = `${alphaInput.value}%`
    })
    alphaInput.addEventListener('change', this.commit)

    const alphaRow = document.createElement('div')
    alphaRow.className = 'cm-swatch-popover-alpha'
    alphaRow.append(alphaInput, readout)

    const el = document.createElement('div')
    el.className = 'cm-swatch-popover'
    el.append(colorInput, alphaRow)
    this.el = el
    this.colorInput = colorInput
    this.alphaInput = alphaInput

    // Inside view.dom so the editor theme's scoped styles reach it; fixed
    // positioning keeps it out of the scroller's coordinate space.
    view.dom.appendChild(el)
    const rect = anchor.getBoundingClientRect()
    el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - el.offsetWidth - 8))}px`
    const below = rect.bottom + 4
    el.style.top =
      below + el.offsetHeight > window.innerHeight - 8
        ? `${Math.max(8, rect.top - el.offsetHeight - 4)}px`
        : `${below}px`

    document.addEventListener('pointerdown', this.onPointerDown, true)
    document.addEventListener('keydown', this.onKeyDown, true)
    window.addEventListener('scroll', this.onScroll, true)
  }

  close() {
    if (!this.el) return
    this.el.remove()
    document.removeEventListener('pointerdown', this.onPointerDown, true)
    document.removeEventListener('keydown', this.onKeyDown, true)
    window.removeEventListener('scroll', this.onScroll, true)
    this.el = null
    this.anchor = null
    this.view = null
    this.colorInput = null
    this.alphaInput = null
  }

  closeFor(view: EditorView) {
    if (this.view === view) this.close()
  }

  handleUpdate(update: ViewUpdate) {
    if (!this.el || this.view !== update.view || !update.docChanged) return
    this.hexFrom = update.changes.mapPos(this.hexFrom)
    this.hexTo = update.changes.mapPos(this.hexTo)
    const text = update.state.doc.sliceString(this.hexFrom, this.hexTo)
    if (!HEX_VALUE_RE.test(text)) this.close()
  }

  private commit = () => {
    if (!this.el || !this.view || !this.colorInput || !this.alphaInput) return
    const hex = composeHexAlpha(this.colorInput.value, Number(this.alphaInput.value))
    if (this.view.state.doc.sliceString(this.hexFrom, this.hexTo) === hex) return
    this.view.dispatch({ changes: { from: this.hexFrom, to: this.hexTo, insert: hex } })
  }

  // The anchor swatch is exempt so its own click handler can toggle closed
  // instead of this closing and the click immediately reopening.
  private onPointerDown = (e: PointerEvent) => {
    if (!(e.target instanceof Node)) return
    if (this.el?.contains(e.target) || this.anchor?.contains(e.target)) return
    this.close()
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close()
  }

  private onScroll = (e: Event) => {
    if (e.target instanceof Node && this.el?.contains(e.target)) return
    this.close()
  }
}

const popover = new SwatchPopover()

// Inline chip in front of every "#rrggbb"/"#rrggbbaa" string: a checkerboard-
// backed button (so alpha reads as transparency) that opens the shared
// color + alpha popover for just that value.
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
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'cm-color-swatch'
    button.title = this.color
    const fill = document.createElement('span')
    fill.className = 'cm-color-swatch-fill'
    fill.style.backgroundColor = this.color
    button.appendChild(fill)
    button.addEventListener('click', (e) => {
      e.preventDefault()
      popover.toggle(view, button, this.hexFrom, this.hexTo, this.color)
    })
    return button
  }

  // Let clicks reach the button instead of moving the CM selection.
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
      private readonly view: EditorView

      constructor(view: EditorView) {
        this.view = view
        this.decorations = buildSwatches(view)
      }

      update(update: ViewUpdate) {
        popover.handleUpdate(update)
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildSwatches(update.view)
        }
      }

      destroy() {
        popover.closeFor(this.view)
      }
    },
    { decorations: (plugin) => plugin.decorations },
  )
}
