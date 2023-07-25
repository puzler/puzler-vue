type ColorPaletteConstructor = {
  colors: Record<string, string>
  pages: Array<Array<string>>
}

const DEFAULT_COLORS = {
  '0': 'rgb(255, 255, 255)',
  '1': 'rgb(180, 128, 241)',
  '2': 'rgb(116, 245, 201)',
  '3': 'rgb(218, 218, 218)',
  '4': 'rgb(102, 195, 101)',
  '5': 'rgb(255, 154, 248)',
  '6': 'rgb(253, 126, 33)',
  '7': 'rgb(247, 89, 99)',
  '8': 'rgb(247, 224, 108)',
  '9': 'rgb(119, 191, 255)',
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

const DEFAULT_PAGES = [
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

const MAX_PAGES = 5
const MIN_PAGES = 1

class ColorPalette {
  colors: Record<string, string>
  pages: Array<Array<string>>
  defaultColor = 'rgb(255, 255, 255)'

  constructor(options?: ColorPaletteConstructor) {
    this.colors = options?.colors || DEFAULT_COLORS
    this.pages = options?.pages || DEFAULT_PAGES
  }

  static fromString(jsonString: string) {
    return new ColorPalette(
      JSON.parse(jsonString)
    )
  }

  resetFromString(jsonString: string) {
    const resetPalette = ColorPalette.fromString(jsonString)
    this.pages = resetPalette.pages
    this.colors = resetPalette.colors
  }

  toJson(): string {
    return JSON.stringify({
      colors: this.colors,
      pages: this.pages,
    })
  }

  private get availableKeys() {
    const usedKeys = this.pages.flat()
    return ALL_KEYS.filter((k) => !usedKeys.includes(k))
  }

  newPage(): undefined|Array<string> {
    if (this.pages.length >= MAX_PAGES) return
    const newKeys = this.availableKeys.slice(0, 10)
    this.pages.push(newKeys)
    newKeys.forEach((k) => this.colors[k] = this.defaultColor)
    return this.pages[this.pages.length - 1]
  }

  duplicatePage(pageIndex: number): undefined|Array<string> {
    if (this.pages.length >= MAX_PAGES) return

    const pageToCopy = this.pages[pageIndex]
    if (!pageToCopy) return

    const newKeys = this.availableKeys.slice(0, 10)
    this.pages.splice(pageIndex + 1, 0, newKeys)
    newKeys.forEach((k, i) => this.colors[k] = this.colors[pageToCopy[i]])
    return this.pages[pageIndex + 1]
  }

  deletePage(pageIndex: number): boolean {
    if (this.pages.length <= MIN_PAGES) return false
    
    const pageToDelete = this.pages[pageIndex]
    if (!pageToDelete) return false

    pageToDelete.forEach((k) => delete this.colors[k])
    this.pages.splice(pageIndex, 1)
    return true
  }

  movePageLeft(pageIndex: number): boolean {
    if (pageIndex === 0) return false

    const targetPage = this.pages[pageIndex]
    const replacingPage = this.pages[pageIndex - 1]
    if (!targetPage || !replacingPage) return false

    const temp = [...targetPage]
    this.pages[pageIndex] = [...replacingPage]
    this.pages[pageIndex - 1] = temp
    return true
  }

  movePageRight(pageIndex: number): boolean {
    if (pageIndex === this.pages.length - 1) return false

    const targetPage = this.pages[pageIndex]
    const replacingPage = this.pages[pageIndex + 1]
    if (!targetPage || !replacingPage) return false

    const temp = [...targetPage]
    this.pages[pageIndex] = [...replacingPage]
    this.pages[pageIndex + 1] = temp
    return true
  }
}

export {
  ColorPalette
}
