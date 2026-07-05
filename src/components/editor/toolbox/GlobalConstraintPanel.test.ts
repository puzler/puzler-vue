import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GlobalConstraintPanel from './GlobalConstraintPanel.vue'
import { useEditorStore } from '@/stores/editor'

// Self-toggle groups (disjoint sets) have no variant checkboxes — the group's
// own type is the rule toggle. The panel must offer an Enable checkbox for
// them, or the chip sits in the sidebar with no way to turn the rule on
// (historically it only activated via JSON import).

let pinia: ReturnType<typeof createPinia>

function render(activeTool: string) {
  const editor = useEditorStore()
  editor.activeTypes = new Set([activeTool])
  editor.setActiveTool(activeTool)
  const w = mount(GlobalConstraintPanel, { global: { plugins: [pinia] } })
  return { w, editor }
}

describe('GlobalConstraintPanel', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders an Enable checkbox for a self-toggle group and toggles its variant', async () => {
    const { w, editor } = render('disjoint_sets')
    const checkbox = w.get('input[type="checkbox"]')
    expect(w.text()).toContain('Enable disjoint sets')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)

    await checkbox.trigger('change')
    expect(editor.activeGlobalVariants.has('disjoint_sets')).toBe(true)

    await checkbox.trigger('change')
    expect(editor.activeGlobalVariants.has('disjoint_sets')).toBe(false)
  })

  it('shows the Enable checkbox as checked when the rule is already on', () => {
    const editor = useEditorStore()
    editor.activeGlobalVariants = new Set(['disjoint_sets'])
    const { w } = render('disjoint_sets')
    expect((w.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('renders variant checkboxes (not the self toggle) for a variant group', () => {
    const { w } = render('chess')
    expect(w.text()).not.toContain('Enable chess')
    const labels = w.findAll('label').map((l) => l.text())
    expect(labels).toContain("King's move")
    expect(labels).toContain("Knight's move")
  })
})
