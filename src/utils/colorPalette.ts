// Cell-coloring palette, ported from the old Puzler (functionality 1:1). A
// palette is a set of named colors (single-character keys) arranged into pages
// of up to 10. Cells store color *keys*; the key→rgba resolution and the pastel
// transparency conversion live here so palette edits recolor existing cells.

export type ColorPaletteData = {
  colors: Record<string, string>
  pages: string[][]
}

// The exact default palette from the old Puzler (colors + 3 pages of 10).
const DEFAULT_COLORS: Record<string, string> = {
  '0': 'rgb(255, 255, 255)',
  '1': 'rgb(180, 128, 241)',
  '2': 'rgb(116, 245, 201)',
  '3': 'rgb(218, 218, 218)',
  '4': 'rgb(102, 195, 101)',
  '5': 'rgb(255, 154, 248)',
  '6': 'rgb(255, 153, 78)',
  '7': 'rgb(247, 89, 99)',
  '8': 'rgb(247, 224, 108)',
  '9': 'rgb(140, 201, 255)',
  'a': 'rgb(255, 255, 255)',
  'b': 'rgb(204, 51, 17)',
  'c': 'rgb(17, 119, 51)',
  'd': 'rgb(0, 68, 196)',
  'e': 'rgb(238, 153, 170)',
  'f': 'rgb(255, 255, 25)',
  'g': 'rgb(240, 70, 240)',
  'h': 'rgb(160, 90, 30)',
  'i': 'rgb(51, 187, 238)',
  'j': 'rgb(145, 30, 180)',
  'k': 'rgb(255, 255, 255)',
  'l': 'rgb(245, 58, 55)',
  'm': 'rgb(76, 175, 80)',
  'n': 'rgb(61, 153, 245)',
  'o': 'rgb(249, 136, 134)',
  'p': 'rgb(149, 208, 151)',
  'q': 'rgb(158, 204, 250)',
  'r': 'rgb(170, 12, 9)',
  's': 'rgb(47, 106, 49)',
  't': 'rgb(9, 89, 170)',
}

const DEFAULT_PAGES: string[][] = [
  ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
  ['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't'],
]

const ALL_KEYS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
  'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
  'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
  'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
]

export const MAX_PAGES = 5
export const MIN_PAGES = 1
export const PAGE_SIZE = 10
export const DEFAULT_PALETTE_COLOR = 'rgb(255, 255, 255)'

export class ColorPalette {
  colors: Record<string, string>
  pages: string[][]
  defaultColor = DEFAULT_PALETTE_COLOR

  constructor(options?: ColorPaletteData) {
    this.colors = options?.colors ?? { ...DEFAULT_COLORS }
    this.pages = options?.pages ?? DEFAULT_PAGES.map((p) => [...p])
  }

  static fromString(jsonString: string): ColorPalette {
    return new ColorPalette(JSON.parse(jsonString))
  }

  toData(): ColorPaletteData {
    return { colors: { ...this.colors }, pages: this.pages.map((p) => [...p]) }
  }

  toJson(): string {
    return JSON.stringify(this.toData())
  }

  private get availableKeys(): string[] {
    const used = this.pages.flat()
    return ALL_KEYS.filter((k) => !used.includes(k))
  }

  newPage(): string[] | undefined {
    if (this.pages.length >= MAX_PAGES) return
    const newKeys = this.availableKeys.slice(0, PAGE_SIZE)
    this.pages.push(newKeys)
    newKeys.forEach((k) => { this.colors[k] = this.defaultColor })
    return this.pages[this.pages.length - 1]
  }

  duplicatePage(pageIndex: number): string[] | undefined {
    if (this.pages.length >= MAX_PAGES) return
    const pageToCopy = this.pages[pageIndex]
    if (!pageToCopy) return
    const newKeys = this.availableKeys.slice(0, PAGE_SIZE)
    this.pages.splice(pageIndex + 1, 0, newKeys)
    newKeys.forEach((k, i) => { this.colors[k] = this.colors[pageToCopy[i]] })
    return this.pages[pageIndex + 1]
  }

  deletePage(pageIndex: number): boolean {
    if (this.pages.length <= MIN_PAGES) return false
    const pageToDelete = this.pages[pageIndex]
    if (!pageToDelete) return false
    pageToDelete.forEach((k) => { delete this.colors[k] })
    this.pages.splice(pageIndex, 1)
    return true
  }

  movePageLeft(pageIndex: number): boolean {
    if (pageIndex === 0) return false
    const target = this.pages[pageIndex]
    const replacing = this.pages[pageIndex - 1]
    if (!target || !replacing) return false
    this.pages[pageIndex] = [...replacing]
    this.pages[pageIndex - 1] = [...target]
    return true
  }

  movePageRight(pageIndex: number): boolean {
    if (pageIndex === this.pages.length - 1) return false
    const target = this.pages[pageIndex]
    const replacing = this.pages[pageIndex + 1]
    if (!target || !replacing) return false
    this.pages[pageIndex] = [...replacing]
    this.pages[pageIndex + 1] = [...target]
    return true
  }
}

// --- Colour resolution (pastel transparency, ported 1:1) -------------------
//
// Palette colours are opaque rgb strings, but cells render them semi-transparent
// over white so digits stay readable. White maps to fully transparent (i.e. an
// effective "no colour"). This matches the old CellBackgroundColor renderer.

type Rgb = { red: number; green: number; blue: number; opacity: number }

const WHITE = { alpha: 1, red: 255, green: 255, blue: 255 }

export function parseRgb(input: string | undefined): Rgb | null {
  if (!input) return null
  const m = input.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,/\s]+([\d.]+))?\s*\)/i)
  if (m) {
    return { red: +m[1], green: +m[2], blue: +m[3], opacity: m[4] !== undefined ? +m[4] : 1 }
  }
  const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return {
      red: parseInt(full.slice(0, 2), 16),
      green: parseInt(full.slice(2, 4), 16),
      blue: parseInt(full.slice(4, 6), 16),
      opacity: 1,
    }
  }
  return null
}

function convertToAlpha(value: number, backgroundValue: number, originalAlpha: number, targetAlpha: number): number {
  if (targetAlpha === 0) return 0
  return -1 * (((1 - targetAlpha) * backgroundValue * WHITE.alpha - value * originalAlpha) / targetAlpha)
}

// Convert a palette colour to the pastel rgba actually painted into a cell. The
// colour's hue is rendered as a light, digit-friendly pastel (derived from its
// lightness, the old-Puzler behaviour); the colour's own alpha then scales how
// strongly it tints, so the cell (and any cosmetic beneath) shows through.
// Returns null for white or fully-transparent colours (render nothing).
export function transparentFill(colorString: string | undefined): string | null {
  const color = parseRgb(colorString)
  if (!color) return null
  const { red, green, blue, opacity } = color
  const minValue = Math.min(red, green, blue)
  const minAlpha = 1 - minValue / 255
  const finalAlpha = minAlpha * opacity
  if (finalAlpha === 0) return null // white or fully transparent → no fill
  // Pastel rgb assumes an opaque colour (keeps the hue stable); alpha only
  // scales the final coverage.
  const r = convertToAlpha(red, WHITE.red, 1, minAlpha)
  const g = convertToAlpha(green, WHITE.green, 1, minAlpha)
  const b = convertToAlpha(blue, WHITE.blue, 1, minAlpha)
  return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`
}

// A small CSS checkerboard, shown behind swatches so any transparency reads as
// transparent rather than as a solid colour.
export const CHECKER_BG = 'repeating-conic-gradient(#cbd0d6 0% 25%, #ffffff 0% 50%) 50% / 12px 12px'

// CSS `background` for a swatch: the (possibly translucent) colour layered over
// the checkerboard, so opaque colours look solid and translucent ones reveal
// it. Slots that paint nothing in a cell (white / fully transparent) show only
// the checkerboard, so they read honestly as "no colour".
export function swatchBackground(colorString: string | undefined): string {
  if (transparentFill(colorString) === null) return CHECKER_BG
  const c = colorString ?? DEFAULT_PALETTE_COLOR
  return `linear-gradient(${c}, ${c}), ${CHECKER_BG}`
}

const KEY = 'puzler:color-palette'

export function loadColorPalette(): ColorPalette {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new ColorPalette()
    return ColorPalette.fromString(raw)
  } catch {
    return new ColorPalette()
  }
}

export function saveColorPalette(palette: ColorPalette): void {
  try {
    localStorage.setItem(KEY, palette.toJson())
  } catch {
    // ignore (private mode / unavailable storage)
  }
}

// A server-sourced palette blob may be the bare `{}` default or malformed.
// Returns null when there's nothing usable so callers can keep the local copy.
export function paletteDataFromRaw(raw: unknown): ColorPaletteData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<ColorPaletteData>
  if (!data.colors || !Array.isArray(data.pages) || data.pages.length === 0) return null
  return { colors: { ...data.colors }, pages: data.pages.map((p) => [...p]) }
}
