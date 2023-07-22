import type { ColorPallete } from '../types'

enum ControllerMode {
  digit,
  center,
  corner,
  color,
}

class Controller {
  mode: ControllerMode = ControllerMode.digit
  modKeys = {
    alt: false,
    shift: false,
    ctrl: false,
    meta: false,
  }
  colorPageIndex = 0
  colorPallete: ColorPallete

  constructor(colorPallete: ColorPallete) {
    this.colorPallete = colorPallete
  }

  get colorPage() {
    let pageColors = this.colorPallete.pages[this.colorPageIndex]
    if (!pageColors) {
      this.colorPageIndex = 0
      pageColors = this.colorPallete.pages[this.colorPageIndex]
      if (!pageColors) {
        throw 'Pallete is Invalid'
      }
    }

    const pagePallete = {} as Record<number, { key: string; color: string }>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((i: number) => {
      const key = pageColors[i] || '0'
      pagePallete[i] = {
        key,
        color: this.colorPallete.colors[key] || 'transparent',
      }
    })
    return pagePallete
  }

  get activeMode() {
    const {
      alt,
      shift,
      ctrl,
      meta,
    } = this.modKeys

    const digit = alt
    const corner = shift
    const center = ctrl || meta

    if (digit) return ControllerMode.digit
    if (corner && center) return ControllerMode.color
    if (corner) return ControllerMode.corner
    if (center) return ControllerMode.center
    return this.mode
  }
}

export { Controller, ControllerMode }
