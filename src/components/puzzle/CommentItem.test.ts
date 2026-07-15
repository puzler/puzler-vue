import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import CommentItem from './CommentItem.vue'
import type { CommentFieldsFragment } from '@/graphql/generated/types'

const { mockMutate } = vi.hoisted(() => ({ mockMutate: vi.fn() }))

vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { mutate: mockMutate },
}))

function makeComment(overrides: Partial<CommentFieldsFragment> = {}): CommentFieldsFragment {
  return {
    id: '1',
    body: 'nice one',
    createdAt: '2026-07-14T00:00:00Z',
    commenterSolved: true,
    isAuthor: false,
    isSpoiler: false,
    spoilersRedacted: false,
    spoilerMarkedBySetter: false,
    canDelete: false,
    canMarkSpoiler: false,
    segments: [{ spoiler: false, redacted: false, text: 'nice one' }],
    user: { id: '2', username: 'ann', displayName: 'Ann', avatarUrl: null },
    ...overrides,
  } as CommentFieldsFragment
}

function render(overrides: Partial<CommentFieldsFragment> = {}) {
  return mount(CommentItem, {
    props: { comment: makeComment(overrides) },
    global: { stubs: { RouterLink: RouterLinkStub, teleport: true } },
  })
}

describe('CommentItem', () => {
  beforeEach(() => {
    mockMutate.mockReset()
  })

  it('hides the action buttons without permissions', () => {
    const wrapper = render()
    expect(wrapper.find('[data-testid="delete-comment"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="spoiler-toggle"]').exists()).toBe(false)
  })

  it('deletes after confirmation and emits changed', async () => {
    mockMutate.mockResolvedValue({ data: { deleteComment: { success: true } } })
    const wrapper = render({ canDelete: true })

    await wrapper.find('[data-testid="delete-comment"]').trigger('click')
    expect(wrapper.text()).toContain('Any replies to it will be deleted too.')
    expect(mockMutate).not.toHaveBeenCalled()

    const confirm = wrapper.findAll('button').find((b) => b.text() === 'Delete' && b.element.className.includes('bg-red'))
    await confirm!.trigger('click')
    await vi.waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())
    expect(mockMutate.mock.calls[0][0].variables).toEqual({ id: '1' })
    await vi.waitFor(() => expect(wrapper.emitted('changed')).toBeTruthy())
  })

  it('toggles the spoiler flag and emits changed', async () => {
    mockMutate.mockResolvedValue({ data: { setCommentSpoiler: { comment: null, errors: [] } } })
    const wrapper = render({ canMarkSpoiler: true })

    const toggle = wrapper.find('[data-testid="spoiler-toggle"]')
    expect(toggle.text()).toBe('Mark spoiler')
    await toggle.trigger('click')
    await vi.waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())
    expect(mockMutate.mock.calls[0][0].variables).toEqual({ id: '1', spoiler: true })
    await vi.waitFor(() => expect(wrapper.emitted('changed')).toBeTruthy())
  })

  it('surfaces mutation errors instead of emitting changed', async () => {
    mockMutate.mockResolvedValue({
      data: { setCommentSpoiler: { comment: null, errors: ['Only the person who marked this spoiler can unmark it'] } },
    })
    const wrapper = render({ canMarkSpoiler: true, isSpoiler: true, spoilersRedacted: false })

    await wrapper.find('[data-testid="spoiler-toggle"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('can unmark it'))
    expect(wrapper.emitted('changed')).toBeFalsy()
  })
})
