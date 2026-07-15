import { describe, expect, it } from 'vitest'
import { hasSpoilerSections, wrapSelectionInSpoiler } from './spoilerMarkup'

describe('wrapSelectionInSpoiler', () => {
  it('wraps the selected range', () => {
    const result = wrapSelectionInSpoiler('the trick is here', 4, 9)
    expect(result.text).toBe('the ||trick|| is here')
    expect(result.caret).toBe(13)
  })

  it('inserts an empty pair at the caret when nothing is selected', () => {
    const result = wrapSelectionInSpoiler('ab', 1, 1)
    expect(result.text).toBe('a||||b')
    expect(result.caret).toBe(3)
  })

  it('wraps at the very end of the text', () => {
    const result = wrapSelectionInSpoiler('tail', 0, 4)
    expect(result.text).toBe('||tail||')
    expect(result.caret).toBe(8)
  })
})

describe('hasSpoilerSections', () => {
  it('detects a complete section', () => {
    expect(hasSpoilerSections('a ||b|| c')).toBe(true)
  })

  it('ignores an unclosed delimiter', () => {
    expect(hasSpoilerSections('a || b')).toBe(false)
  })

  it('ignores plain text', () => {
    expect(hasSpoilerSections('nothing here')).toBe(false)
  })
})
