// A shared stack of open overlays (modals, sheets) so the Escape key closes only
// the topmost one, and the keypress is swallowed in the capture phase before any
// window-level listener can react to it. The grid keyboard handler
// (useGridKeyboard) listens on `window` in the bubble phase, so a capture-phase
// listener on `document` here runs first; calling stopPropagation prevents an
// Escape that closes a modal from also clearing the grid selection underneath.
type CloseFn = () => void

const stack: CloseFn[] = []
let listening = false

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const top = stack[stack.length - 1]
  if (!top) return
  event.preventDefault()
  event.stopPropagation()
  top()
}

function ensureListening() {
  if (listening) return
  document.addEventListener('keydown', onKeyDown, true)
  listening = true
}

function stopListening() {
  if (!listening) return
  document.removeEventListener('keydown', onKeyDown, true)
  listening = false
}

// True while any overlay (modal or sheet) is open. The grid keyboard handler
// (useGridKeyboard) consults this to ignore keystrokes while a modal is up, so
// typing into modal content (e.g. the TipTap description editor, which is a
// contenteditable rather than an <input>) doesn't leak through to the grid.
export function isModalOpen(): boolean {
  return stack.length > 0
}

// Register an overlay's close handler as the new top of the stack. Returns an
// unregister function (call on unmount). Only the topmost overlay reacts to
// Escape, so nested overlays (e.g. the theme editor inside player settings)
// close one layer at a time.
export function pushModal(close: CloseFn): () => void {
  stack.push(close)
  ensureListening()
  let removed = false
  return () => {
    if (removed) return
    removed = true
    const i = stack.lastIndexOf(close)
    if (i !== -1) stack.splice(i, 1)
    if (stack.length === 0) stopListening()
  }
}
