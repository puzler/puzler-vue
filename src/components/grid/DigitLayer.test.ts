import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DigitLayer from './DigitLayer.vue'
import type { CellState } from '@/types/grid'

// DigitLayer paints the most important content on the grid: given digits, the
// player's entered digits, and corner/center pencil marks. Pin each so a layout
// change can't silently stop rendering them.

let pinia: ReturnType<typeof createPinia>

const cell = (o: Partial<CellState> = {}): CellState => ({
  value: null, cornerMarks: [], centerMarks: [], color: null, colors: [], ...o,
})

describe('DigitLayer', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = (props: {
    givenDigits?: Record<string, number>
    cellStates?: Record<string, CellState>
  }) =>
    mount(DigitLayer, {
      props: { givenDigits: {}, ...props },
      global: { plugins: [pinia] },
    })

  it('renders a given digit, styled as a given (bold)', () => {
    const given = render({ givenDigits: { r0c0: 5 } }).get('text.digit-given')
    expect(given.text()).toBe('5')
    expect(given.attributes('font-weight')).toBe('700')
  })

  it('renders a player-entered value, styled as input (not given)', () => {
    const w = render({ cellStates: { r1c1: cell({ value: 7 }) } })
    const input = w.get('text.digit-input')
    expect(input.text()).toBe('7')
    expect(w.find('text.digit-given').exists()).toBe(false)
  })

  it('renders one text per corner pencil mark', () => {
    const w = render({ cellStates: { r0c0: cell({ cornerMarks: [1, 2, 3] }) } })
    // No givens/values, so every <text> here is a corner mark.
    expect(w.findAll('text')).toHaveLength(3)
  })

  it('renders center pencil marks as tspans inside one text element', () => {
    const w = render({ cellStates: { r0c0: cell({ centerMarks: [4, 5, 6] }) } })
    expect(w.findAll('text')).toHaveLength(1)
    expect(w.findAll('tspan').map((t) => t.text())).toEqual(['4', '5', '6'])
  })

  it('hides pencil marks once the cell holds a value', () => {
    const w = render({ cellStates: { r0c0: cell({ value: 8, cornerMarks: [1, 2], centerMarks: [3] }) } })
    // Only the entered value should render; marks are suppressed.
    expect(w.findAll('text')).toHaveLength(1)
    expect(w.get('text.digit-input').text()).toBe('8')
  })
})
