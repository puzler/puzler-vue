// Registry of the OPTIONAL solver numpad modes beyond the core four (digit /
// corner / center / color). Enabled extras render along whichever axis the
// host layout has room to scroll: a full-width inset shelf above the numpad on
// desktop (NumpadExtraToolsBar — the side panel constrains width) and a
// vertical rail beside the mode keys on mobile (NumpadExtraToolsRail — the
// bottom window constrains height). Either way, any number of future tools
// costs one fixed-thickness scrolling strip; the pad itself never grows or
// shrinks. Adding a tool = one entry here.

import { mdiCursorMove, mdiDraw } from '@mdi/js'
import type { PlayerSettings } from '@/utils/playerSettings'
import type { SolverInputMode } from '@/types/grid'

export interface ExtraNumpadMode {
  mode: SolverInputMode
  title: string
  label: string
  icon: string
}

export interface GridSize {
  rows: number
  cols: number
}

// Above this many rows or columns the Pan tool appears regardless of the
// setting: 16 was the historical grid cap, so anything bigger is a
// gattai-scale board that is unusable without zoom — and every pre-existing
// puzzle keeps its exact tool set.
export const PAN_AUTO_THRESHOLD = 16

export function panToolAvailable(settings: PlayerSettings, size: GridSize): boolean {
  return settings.enablePanTool || size.rows > PAN_AUTO_THRESHOLD || size.cols > PAN_AUTO_THRESHOLD
}

// Shared look for the strip/rail keys, matching the core mode keys' states.
export function extraToolClass(active: boolean): string {
  return active
    ? 'bg-action border-action text-on-action'
    : 'bg-surface border-line text-soft hover:border-action hover:text-action'
}

export function enabledExtraModes(settings: PlayerSettings, size: GridSize): ExtraNumpadMode[] {
  const out: ExtraNumpadMode[] = []
  if (settings.enableLineTool) {
    out.push({ mode: 'line', title: 'Line tool (B)', label: 'Line tool', icon: mdiDraw })
  }
  if (panToolAvailable(settings, size)) {
    out.push({ mode: 'pan', title: 'Pan (B)', label: 'Pan tool', icon: mdiCursorMove })
  }
  return out
}

// The mode the B key lands on next: extras cycle in registry order, entered
// from any core mode at the first entry, wrapping at the end. Null when no
// extra tool is enabled (B then does nothing). One keybind covers every
// future tool.
export function nextExtraMode(extras: ExtraNumpadMode[], current: string): SolverInputMode | null {
  if (!extras.length) return null
  const idx = extras.findIndex((m) => m.mode === current)
  return extras[(idx + 1) % extras.length].mode
}

// Smoothly center a tool key inside its scrolling strip (and ONLY the strip —
// scrollIntoView would also nudge scrollable ancestors), so cycling with B
// shows where you are and what comes next.
export function centerToolInStrip(container: HTMLElement, button: HTMLElement, axis: 'x' | 'y'): void {
  const c = container.getBoundingClientRect()
  const b = button.getBoundingClientRect()
  if (axis === 'x') {
    const left = container.scrollLeft + (b.left - c.left) - (c.width - b.width) / 2
    container.scrollTo?.({ left, behavior: 'smooth' })
  } else {
    const top = container.scrollTop + (b.top - c.top) - (c.height - b.height) / 2
    container.scrollTo?.({ top, behavior: 'smooth' })
  }
}
