// Distinct, readable ring colors for multiplayer cursors. Assignment is
// deterministic by sorted actorId, so every client paints a given peer the same
// color. Up to PALETTE.length peers get a unique color; beyond that colors wrap.

const PALETTE = [
  'rgba(59,130,246,0.9)', // blue
  'rgba(236,72,153,0.9)', // pink
  'rgba(34,197,94,0.9)', // green
  'rgba(168,85,247,0.9)', // purple
  'rgba(249,115,22,0.9)', // orange
  'rgba(20,184,166,0.9)', // teal
  'rgba(234,179,8,0.9)', // amber
  'rgba(239,68,68,0.9)', // red
  'rgba(99,102,241,0.9)', // indigo
  'rgba(132,204,22,0.9)', // lime
]

// How many peer selection rings we render at once (the panel notes the overflow).
export const MAX_CURSOR_RINGS = 6

export function assignColors(sortedActorIds: string[]): Map<string, string> {
  const map = new Map<string, string>()
  sortedActorIds.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]))
  return map
}
