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
 * Start a page's tour on demand (from the "?" button or the Settings replay
 * list). Resolves once the tour has been launched, or returns early if a tour is
 * already running or the page has no visible anchors to point at.
 */
export async function startTour(key: TourKey): Promise<void> {
  if (isTourActive()) return
  await prepareForTour(key)

  const steps = (TOURS[key] ?? []).filter(stepIsVisible)
  if (steps.length === 0) return // nothing on screen to point at

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
  })

  instance.drive()
}
