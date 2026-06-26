import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { cable } from '@/utils/cableConsumer'
import { useEditorStore } from './editor'
import { useAuthStore } from './auth'
import { getGuestName, getGuestToken } from '@/utils/guestIdentity'
import { assignColors, MAX_CURSOR_RINGS } from '@/utils/cursorPalette'

// One connected collaborator (including ourselves) in a play session. Identity
// (actorId/isHost) is server-stamped and trusted; displayName is cosmetic.
export interface PresenceMember {
  actorId: string
  displayName: string
  isHost: boolean
  cells: string[]
  lastSeen: number
}

interface PresenceMessage {
  type: 'join' | 'leave' | 'cursor' | 'kicked'
  actorId: string
  isHost?: boolean
  displayName?: string | null
  cells?: string[]
}

interface PresenceSub {
  perform: (action: string, data?: Record<string, unknown>) => void
  unsubscribe: () => void
}

const STALE_MS = 60_000 // drop a peer whose heartbeat we haven't seen in a minute
const HEARTBEAT_MS = 25_000 // re-announce so idle-but-connected peers aren't pruned
const CURSOR_THROTTLE_MS = 90

// Real-time roster + multiplayer cursors for the active play session. Inert until
// start(playId); reads nothing until then, so editor/solo solving is unaffected.
export const usePresenceStore = defineStore('presence', () => {
  const editor = useEditorStore()
  const auth = useAuthStore()

  const members = ref<Record<string, PresenceMember>>({})
  const wasKicked = ref(false)
  const playId = ref<string | null>(null)

  let sub: PresenceSub | null = null
  let selfId = ''
  let staleTimer: ReturnType<typeof setInterval> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let stopWatch: (() => void) | null = null

  function sessionNameKey(id: string): string {
    return `puzler_session_name:${id}`
  }

  // Our cosmetic name: a per-session override if set, else the account display
  // name, else the editable guest name.
  function myDisplayName(): string {
    const id = playId.value
    if (id) {
      try {
        const override = localStorage.getItem(sessionNameKey(id))
        if (override) return override
      } catch { /* ignore */ }
    }
    return auth.user?.displayName ?? auth.user?.username ?? getGuestName()
  }

  function selfActorId(): string {
    return auth.user ? `user:${auth.user.id}` : `guest:${getGuestToken()}`
  }

  function upsert(actorId: string, patch: Partial<PresenceMember>): void {
    const existing = members.value[actorId]
    members.value = {
      ...members.value,
      [actorId]: {
        actorId,
        displayName: patch.displayName ?? existing?.displayName ?? 'Player',
        isHost: patch.isHost ?? existing?.isHost ?? false,
        cells: patch.cells ?? existing?.cells ?? [],
        lastSeen: Date.now(),
      },
    }
  }

  function remove(actorId: string): void {
    if (!members.value[actorId]) return
    const next = { ...members.value }
    delete next[actorId]
    members.value = next
  }

  function handle(msg: PresenceMessage): void {
    if (msg.type === 'kicked') {
      if (msg.actorId === selfId) { wasKicked.value = true; stop() }
      else remove(msg.actorId)
      return
    }
    if (msg.type === 'leave') {
      if (msg.actorId !== selfId) remove(msg.actorId)
      return
    }
    // join / cursor — both carry identity; cursor also carries cells.
    const isNew = !members.value[msg.actorId]
    upsert(msg.actorId, {
      displayName: msg.displayName ?? undefined,
      isHost: msg.isHost,
      cells: msg.type === 'cursor' ? (msg.cells ?? []).slice(0, 81) : undefined,
    })
    // A newly-seen peer doesn't know about us yet; re-announce (jittered) so the
    // roster converges both ways.
    if (isNew && msg.actorId !== selfId) {
      setTimeout(() => sub?.perform('announce', { display_name: myDisplayName() }), Math.random() * 250)
    }
  }

  function start(id: string): void {
    if (playId.value === id && sub) return
    stop()
    playId.value = id
    wasKicked.value = false
    selfId = selfActorId()

    const broadcastCursor = useThrottleFn(() => {
      sub?.perform('cursor', { cells: [...editor.selection], display_name: myDisplayName() })
    }, CURSOR_THROTTLE_MS, true, true)

    sub = cable.subscriptions.create(
      { channel: 'PresenceChannel', play_id: id, display_name: myDisplayName() },
      {
        received: (data: PresenceMessage) => handle(data),
        // Fires on the initial connect AND every ActionCable reconnect (e.g. after
        // a server restart). ActionCable re-runs the channel's `subscribed` on
        // reconnect — which re-registers us server-side and restores the
        // disconnect -> prune path — so here we just re-announce and re-share our
        // cursor to reconverge the roster promptly, without waiting for the next
        // heartbeat.
        connected: () => {
          sub?.perform('announce', { display_name: myDisplayName() })
          void broadcastCursor()
        },
      },
    ) as PresenceSub

    // Broadcast our selection on change, including clears (empty -> peers drop our ring).
    stopWatch = watch(() => editor.selection, () => { void broadcastCursor() })
    staleTimer = setInterval(pruneStale, 15_000)
    // Keep our roster entry fresh on peers so an idle (non-moving) but connected
    // collaborator isn't pruned as stale.
    heartbeatTimer = setInterval(() => sub?.perform('announce', { display_name: myDisplayName() }), HEARTBEAT_MS)
  }

  function stop(): void {
    sub?.unsubscribe()
    sub = null
    stopWatch?.()
    stopWatch = null
    if (staleTimer) { clearInterval(staleTimer); staleTimer = null }
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    members.value = {}
    playId.value = null
  }

  function pruneStale(): void {
    const cutoff = Date.now() - STALE_MS
    const next = { ...members.value }
    let changed = false
    for (const id of Object.keys(next)) {
      if (id !== selfId && next[id].lastSeen < cutoff) { delete next[id]; changed = true }
    }
    if (changed) members.value = next
  }

  // Rename ourselves for this session only (localStorage, per play). Cosmetic;
  // identity is unchanged. Re-announce so peers pick up the new name.
  function renameSelf(name: string): void {
    const id = playId.value
    const clean = name.trim().slice(0, 40)
    if (!id || !clean) return
    try { localStorage.setItem(sessionNameKey(id), clean) } catch { /* ignore */ }
    upsert(selfId, { displayName: clean })
    sub?.perform('announce', { display_name: clean })
  }

  // Host-first, name-sorted roster (includes self).
  const connectedUsers = computed<PresenceMember[]>(() =>
    Object.values(members.value).sort((a, b) =>
      a.isHost !== b.isHost ? (a.isHost ? -1 : 1) : a.displayName.localeCompare(b.displayName),
    ),
  )
  const hasPeers = computed(() => connectedUsers.value.length > 1)
  const isHost = computed(() => members.value[selfId]?.isHost ?? false)

  const peerColors = computed(() =>
    assignColors(connectedUsers.value.map((m) => m.actorId).filter((id) => id !== selfId).sort()),
  )
  function peerColor(actorId: string): string | undefined {
    return peerColors.value.get(actorId)
  }

  // Peers with a live selection, capped, with their colors — the rendered rings.
  const peerCursors = computed(() =>
    connectedUsers.value
      .filter((m) => m.actorId !== selfId && m.cells.length > 0)
      .slice(0, MAX_CURSOR_RINGS)
      .map((m) => ({ actorId: m.actorId, color: peerColor(m.actorId) ?? '', cells: new Set(m.cells) })),
  )

  return {
    members,
    wasKicked,
    playId,
    connectedUsers,
    hasPeers,
    isHost,
    peerCursors,
    peerColor,
    selfActorId,
    start,
    stop,
    renameSelf,
  }
})
