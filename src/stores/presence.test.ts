import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Capture the channel's `received` callback so tests can feed it server messages.
const { received } = vi.hoisted(() => ({ received: { fn: null as null | ((d: unknown) => void) } }))

vi.mock('@/utils/cableConsumer', () => ({
  cable: {
    subscriptions: {
      create: (_params: unknown, mixin: { received: (d: unknown) => void }) => {
        received.fn = mixin.received
        return { perform: vi.fn(), unsubscribe: vi.fn() }
      },
    },
  },
}))
vi.mock('@/utils/guestIdentity', () => ({
  getGuestToken: () => 'me',
  getGuestName: () => 'guest-0001',
  setGuestName: vi.fn(),
}))
vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { query: vi.fn(), mutate: vi.fn(), subscribe: vi.fn() },
}))

import { usePresenceStore } from './presence'

function emit(msg: Record<string, unknown>): void {
  received.fn?.(msg)
}

describe('presence store', () => {
  let presence: ReturnType<typeof usePresenceStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    presence = usePresenceStore()
    presence.start('play1') // self identity is the mocked guest "guest:me"
  })

  it('builds a host-first roster including self, and reports peers/host', () => {
    emit({ type: 'join', actorId: 'guest:me', isHost: true, displayName: 'guest-0001' })
    emit({ type: 'join', actorId: 'user:2', isHost: false, displayName: 'Bob' })
    expect(presence.connectedUsers.map((m) => m.actorId)).toEqual(['guest:me', 'user:2'])
    expect(presence.hasPeers).toBe(true)
    expect(presence.isHost).toBe(true)
    presence.stop()
  })

  it('renders peer cursors but never our own ring', () => {
    emit({ type: 'join', actorId: 'guest:me', isHost: true, displayName: 'me' })
    emit({ type: 'cursor', actorId: 'guest:me', cells: ['r0c0'], displayName: 'me' })
    emit({ type: 'cursor', actorId: 'user:2', cells: ['r1c1', 'r1c2'], displayName: 'Bob' })
    expect(presence.peerCursors.map((c) => c.actorId)).toEqual(['user:2'])
    expect(presence.peerCursors[0].cells).toEqual(new Set(['r1c1', 'r1c2']))
    presence.stop()
  })

  it('caps rendered cursors at the ring limit', () => {
    emit({ type: 'join', actorId: 'guest:me', isHost: true, displayName: 'me' })
    for (let i = 0; i < 12; i++) {
      emit({ type: 'cursor', actorId: `user:${i}`, cells: ['r0c0'], displayName: `u${i}` })
    }
    expect(presence.peerCursors.length).toBeLessThanOrEqual(6)
    presence.stop()
  })

  it('drops a peer on leave', () => {
    emit({ type: 'join', actorId: 'guest:me', isHost: true, displayName: 'me' })
    emit({ type: 'join', actorId: 'user:2', isHost: false, displayName: 'Bob' })
    emit({ type: 'leave', actorId: 'user:2' })
    expect(presence.connectedUsers.map((m) => m.actorId)).toEqual(['guest:me'])
    presence.stop()
  })

  it('flags wasKicked when we are the kick target', () => {
    emit({ type: 'join', actorId: 'guest:me', isHost: false, displayName: 'me' })
    emit({ type: 'kicked', actorId: 'guest:me' })
    expect(presence.wasKicked).toBe(true)
  })
})
