import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PuzzleThumbnail from './PuzzleThumbnail.vue'
import SudokuGrid from './SudokuGrid.vue'
import InteractionLayer from './InteractionLayer.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle } from '@/utils/puzzleExport'

// PuzzleThumbnail renders a puzzle as a STATIC preview (card grids, etc.). It
// must mount the grid non-interactively — an interactive thumbnail would hijack
// pointer input on listing pages — so pin that it omits the InteractionLayer.

let pinia: ReturnType<typeof createPinia>

describe('PuzzleThumbnail', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  function render() {
    // Build a valid definition from the (empty) stores via the real serializer.
    const definition = serializePuzzle(useEditorStore(), useGridStore())
    return mount(PuzzleThumbnail, { props: { definition }, global: { plugins: [pinia] } })
  }

  it('renders the grid but without the interaction layer (static preview)', async () => {
    const w = render()
    // `ready` flips true in onMounted, so the grid renders after a tick.
    await flushPromises()
    expect(w.findComponent(SudokuGrid).exists()).toBe(true)
    expect(w.findComponent(InteractionLayer).exists()).toBe(false)
  })
})
