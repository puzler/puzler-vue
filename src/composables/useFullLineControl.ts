import { ref, watch } from 'vue'

// Shared UI preference (not part of a theme): whether line-width editing shows the numeric
// slider ("full control") or the simpler Thin/Normal/Thick segmented control. Persisted locally.
const KEY = 'puzler:theme-full-line-control'

function load(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

const fullLineControl = ref(load())

watch(fullLineControl, (v) => {
  try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* ignore (private mode) */ }
})

export function useFullLineControl() {
  return fullLineControl
}
