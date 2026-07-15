import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CommentBody from './CommentBody.vue'
import type { CommentFieldsFragment } from '@/graphql/generated/types'

function makeComment(overrides: Partial<CommentFieldsFragment> = {}): CommentFieldsFragment {
  return {
    id: '1',
    body: 'safe text',
    createdAt: '2026-07-14T00:00:00Z',
    commenterSolved: false,
    isAuthor: false,
    isSpoiler: false,
    spoilersRedacted: false,
    spoilerMarkedBySetter: false,
    canDelete: false,
    canMarkSpoiler: false,
    segments: [{ spoiler: false, redacted: false, text: 'safe text' }],
    user: { id: '2', username: 'ann', displayName: 'Ann', avatarUrl: null },
    ...overrides,
  } as CommentFieldsFragment
}

function render(overrides: Partial<CommentFieldsFragment> = {}) {
  return mount(CommentBody, { props: { comment: makeComment(overrides) } })
}

describe('CommentBody', () => {
  it('renders plain text segments', () => {
    expect(render().text()).toContain('safe text')
  })

  it('shows an inert locked chip for redacted section spoilers', () => {
    const wrapper = render({
      spoilersRedacted: true,
      segments: [
        { spoiler: false, redacted: false, text: 'before ' },
        { spoiler: true, redacted: true, text: null },
      ],
    })
    expect(wrapper.find('[data-testid="spoiler-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="spoiler-reveal"]').exists()).toBe(false)
  })

  it('hides revealed spoiler text behind a click-to-reveal toggle', async () => {
    const wrapper = render({
      segments: [{ spoiler: true, redacted: false, text: 'the trick' }],
    })
    const button = wrapper.find('[data-testid="spoiler-reveal"]')
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.find('span').classes()).toContain('invisible')

    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.find('span').classes()).not.toContain('invisible')
    expect(button.text()).toContain('the trick')
  })

  it('shows one full shield for a redacted whole-comment spoiler', () => {
    const wrapper = render({
      isSpoiler: true,
      spoilersRedacted: true,
      segments: [{ spoiler: true, redacted: true, text: null }],
    })
    expect(wrapper.text()).toContain('hidden until you solve')
    expect(wrapper.find('[data-testid="spoiler-reveal"]').exists()).toBe(false)
  })

  it('credits the setter when they applied the flag', () => {
    const wrapper = render({
      isSpoiler: true,
      spoilerMarkedBySetter: true,
      segments: [{ spoiler: true, redacted: false, text: 'hidden take' }],
    })
    expect(wrapper.text()).toContain('Marked as a spoiler by the setter.')
  })
})
