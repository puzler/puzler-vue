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
