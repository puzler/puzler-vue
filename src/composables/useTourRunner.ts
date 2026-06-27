import { nextTick } from 'vue'
import { driver, type DriveStep } from 'driver.js'
import { TOURS, type TourKey } from '@/data/tours'

// A single place that drives driver.js: filters steps to anchors that are
// actually on screen, themes the popover (see the .puzler-tour rules in
// style.css), respects reduced motion, and reports completion.

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Resolve a step's anchor to a visible element. Drops collapsed (w-0) panels,
// empty lists, and unmounted layouts so a tour never points at nothing.
function stepIsVisible(s: DriveStep): boolean {
  const sel = s.element
  if (typeof sel !== 'string') return true
  const el = document.querySelector(sel)
  if (!el) return false
  const rect = (el as HTMLElement).getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/** True while a tour is on screen (driver adds .driver-active to <body>). */
export function isTourActive(): boolean {
  return document.body.classList.contains('driver-active')
}

// Page-specific preparation before a tour runs (e.g. the editor's setting-mode
// panels collapse to zero width, so force setting mode and let layout settle).
async function prepareForTour(key: TourKey): Promise<void> {
  if (key === 'editor') {
    const { useEditorStore } = await import('@/stores/editor')
    useEditorStore().setMode('setting')
    await nextTick()
    await new Promise((r) => setTimeout(r, 320)) // editor panel width transition
  }
}

/**
 * Start a page's tour. Resolves once the tour has been launched (or skipped for
 * lack of visible anchors). `onDone` fires when the tour finishes or is dismissed.
 */
export async function startTour(key: TourKey, opts: { onDone?: () => void } = {}): Promise<void> {
  if (isTourActive()) return
  await prepareForTour(key)

  const steps = (TOURS[key] ?? []).filter(stepIsVisible)
  if (steps.length === 0) {
    // Nothing to show; still record completion so we do not retry every visit.
    opts.onDone?.()
    return
  }

  const instance = driver({
    steps,
    showProgress: true,
    animate: !prefersReducedMotion(),
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 8,
    popoverClass: 'puzler-tour',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    // Fires on natural finish AND on dismiss (close button / escape / overlay).
    onDestroyed: () => {
      opts.onDone?.()
    },
  })

  instance.drive()
}
