import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { enabledExtraModes, nextExtraMode, panToolAvailable, type ExtraNumpadMode } from './numpadModes'
import NumpadExtraToolsBar from './NumpadExtraToolsBar.vue'
import NumpadExtraToolsRail from './NumpadExtraToolsRail.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { DEFAULT_PLAYER_SETTINGS } from '@/utils/playerSettings'
import type { SolverInputMode } from '@/types/grid'

describe('numpadModes registry', () => {
  const SMALL = { rows: 9, cols: 9 }

  it('gates the line tool on its setting', () => {
    expect(enabledExtraModes({ ...DEFAULT_PLAYER_SETTINGS }, SMALL)).toEqual([])
    const modes = enabledExtraModes({ ...DEFAULT_PLAYER_SETTINGS, enableLineTool: true }, SMALL)
    expect(modes.map((m) => m.mode)).toEqual(['line'])
  })

  it('gates the pan tool on its setting OR a gattai-scale board', () => {
    expect(panToolAvailable({ ...DEFAULT_PLAYER_SETTINGS }, SMALL)).toBe(false)
    expect(panToolAvailable({ ...DEFAULT_PLAYER_SETTINGS, enablePanTool: true }, SMALL)).toBe(true)
    // The threshold is the historical 16 cap: existing puzzles never change.
    expect(panToolAvailable({ ...DEFAULT_PLAYER_SETTINGS }, { rows: 16, cols: 16 })).toBe(false)
    expect(panToolAvailable({ ...DEFAULT_PLAYER_SETTINGS }, { rows: 21, cols: 21 })).toBe(true)
    expect(panToolAvailable({ ...DEFAULT_PLAYER_SETTINGS }, { rows: 9, cols: 17 })).toBe(true)

    expect(enabledExtraModes({ ...DEFAULT_PLAYER_SETTINGS }, { rows: 21, cols: 21 })
      .map((m) => m.mode)).toEqual(['pan'])
    expect(enabledExtraModes({ ...DEFAULT_PLAYER_SETTINGS, enablePanTool: true }, SMALL)
      .map((m) => m.mode)).toEqual(['pan'])
  })

  it('cycles line into pan when both are enabled', () => {
    const extras = enabledExtraModes(
      { ...DEFAULT_PLAYER_SETTINGS, enableLineTool: true, enablePanTool: true },
      SMALL,
    )
    expect(extras.map((m) => m.mode)).toEqual(['line', 'pan'])
    expect(nextExtraMode(extras, 'line')).toBe('pan')
    expect(nextExtraMode(extras, 'pan')).toBe('line')
  })
})

describe('nextExtraMode (B-key cycling)', () => {
  const extra = (mode: string): ExtraNumpadMode =>
    ({ mode: mode as SolverInputMode, title: mode, label: mode, icon: '' })

  it('is null with no extras (B does nothing)', () => {
    expect(nextExtraMode([], 'digit')).toBeNull()
  })

  it('enters at the first extra from any core mode', () => {
    expect(nextExtraMode([extra('line')], 'digit')).toBe('line')
    expect(nextExtraMode([extra('line'), extra('t2')], 'color')).toBe('line')
  })

  it('cycles through the extras in order and wraps', () => {
    const extras = [extra('line'), extra('t2'), extra('t3')]
    expect(nextExtraMode(extras, 'line')).toBe('t2')
    expect(nextExtraMode(extras, 't2')).toBe('t3')
    expect(nextExtraMode(extras, 't3')).toBe('line')
  })

  it('a single extra wraps onto itself', () => {
    expect(nextExtraMode([extra('line')], 'line')).toBe('line')
  })
})

describe('extra tools strip (bar + rail)', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it.each([[NumpadExtraToolsBar], [NumpadExtraToolsRail]])(
    'renders nothing when no extra tool is enabled (%#)',
    (component) => {
      const wrapper = mount(component)
      expect(wrapper.find('button').exists()).toBe(false)
    },
  )

  it.each([[NumpadExtraToolsBar], [NumpadExtraToolsRail]])(
    'shows the line tool key when enabled and switches modes on click (%#)',
    async (component) => {
      usePlayerSettingsStore().settings.enableLineTool = true
      const editor = useEditorStore()
      editor.setMode('solving')
      const wrapper = mount(component)
      const btn = wrapper.find('button[aria-label="Line tool"]')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      expect(editor.inputMode).toBe('line')
    },
  )

  it.each([[NumpadExtraToolsBar], [NumpadExtraToolsRail]])(
    'shows the pan tool key on an oversized grid without the setting (%#)',
    async (component) => {
      useGridStore().setDimensions(21, 21)
      const editor = useEditorStore()
      editor.setMode('solving')
      const wrapper = mount(component)
      const btn = wrapper.find('button[aria-label="Pan tool"]')
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      expect(editor.inputMode).toBe('pan')
    },
  )

  it('the bar scrolls horizontally and the rail vertically, scrollbars hidden', () => {
    usePlayerSettingsStore().settings.enableLineTool = true
    const bar = mount(NumpadExtraToolsBar).find('div')
    expect(bar.classes()).toContain('overflow-x-auto')
    expect(bar.classes()).toContain('no-scrollbar')
    const rail = mount(NumpadExtraToolsRail).find('div')
    expect(rail.classes()).toContain('overflow-y-auto')
    expect(rail.classes()).toContain('no-scrollbar')
    expect(rail.classes()).toContain('flex-col')
  })

  it('a mouse drag pans the bar and swallows the click on release', async () => {
    usePlayerSettingsStore().settings.enableLineTool = true
    const editor = useEditorStore()
    editor.setMode('solving')
    const wrapper = mount(NumpadExtraToolsBar)
    const strip = wrapper.find('div')
    strip.element.scrollLeft = 0
    await strip.trigger('pointerdown', { pointerType: 'mouse', button: 0, clientX: 100 })
    await strip.trigger('pointermove', { clientX: 40 }) // drag left by 60px
    expect(strip.element.scrollLeft).toBe(60)
    await strip.trigger('pointerup', { clientX: 40 })
    // The click that follows a real drag lands somewhere in the strip; it must
    // not activate the tool under the pointer.
    await wrapper.find('button[aria-label="Line tool"]').trigger('click')
    expect(editor.inputMode).not.toBe('line')
  })

  it('a plain click (no drag) still activates the tool', async () => {
    usePlayerSettingsStore().settings.enableLineTool = true
    const editor = useEditorStore()
    editor.setMode('solving')
    const wrapper = mount(NumpadExtraToolsBar)
    const strip = wrapper.find('div')
    await strip.trigger('pointerdown', { pointerType: 'mouse', button: 0, clientX: 100 })
    await strip.trigger('pointerup', { clientX: 101 })
    await wrapper.find('button[aria-label="Line tool"]').trigger('click')
    expect(editor.inputMode).toBe('line')
  })

  it('never captures the pointer before the drag slop (capture would retarget the click off the button)', async () => {
    usePlayerSettingsStore().settings.enableLineTool = true
    const wrapper = mount(NumpadExtraToolsBar)
    const strip = wrapper.find('div')
    const captures: number[] = []
    ;(strip.element as HTMLElement & { setPointerCapture: (id: number) => void }).setPointerCapture =
      (id: number) => captures.push(id)
    await strip.trigger('pointerdown', { pointerType: 'mouse', button: 0, clientX: 100, pointerId: 1 })
    await strip.trigger('pointermove', { clientX: 102, pointerId: 1 }) // within slop
    await strip.trigger('pointerup', { clientX: 102, pointerId: 1 })
    expect(captures).toEqual([])
    await strip.trigger('pointerdown', { pointerType: 'mouse', button: 0, clientX: 100, pointerId: 2 })
    await strip.trigger('pointermove', { clientX: 60, pointerId: 2 }) // past slop
    expect(captures).toEqual([2])
  })

  it('touch pointers keep native scrolling (no drag capture)', async () => {
    usePlayerSettingsStore().settings.enableLineTool = true
    const wrapper = mount(NumpadExtraToolsBar)
    const strip = wrapper.find('div')
    strip.element.scrollLeft = 0
    await strip.trigger('pointerdown', { pointerType: 'touch', clientX: 100 })
    await strip.trigger('pointermove', { clientX: 40 })
    expect(strip.element.scrollLeft).toBe(0) // untouched — the browser scrolls natively
  })

  it.each([[NumpadExtraToolsBar], [NumpadExtraToolsRail]])(
    'centers the active tool in the strip when cycling selects it (%#)',
    async (component) => {
      usePlayerSettingsStore().settings.enableLineTool = true
      const editor = useEditorStore()
      editor.setMode('solving')
      const wrapper = mount(component)
      const strip = wrapper.find('div').element as HTMLElement & { scrollTo?: (o: unknown) => void }
      const calls: unknown[] = []
      strip.scrollTo = (o: unknown) => calls.push(o)
      editor.setInputMode('line')
      await wrapper.vm.$nextTick()
      expect(calls.length).toBe(1)
      expect(calls[0]).toMatchObject({ behavior: 'smooth' })
    },
  )
})
