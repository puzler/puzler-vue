// A guest's per-device identity for collaboration: an opaque, unguessable token
// (stable across reloads on this device) plus an editable display name
// ("guest-NNNN"). The token is a capability for that guest's collaborative plays;
// the name is purely cosmetic. Both live in localStorage — neither is an account.
// Mirrors the defensive localStorage pattern in utils/tokenStorage.ts.

const TOKEN_KEY = 'puzler_guest_token'
const NAME_KEY = 'puzler_guest_name'

export function getGuestToken(): string {
  let token = ''
  try {
    token = localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    /* private mode / unavailable storage */
  }
  if (!token) {
    token = crypto.randomUUID().replace(/-/g, '')
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
  }
  return token
}

export function getGuestName(): string {
  let name = ''
  try {
    name = localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    /* ignore */
  }
  if (!name) {
    name = `guest-${Math.floor(1000 + Math.random() * 9000)}`
    try { localStorage.setItem(NAME_KEY, name) } catch { /* ignore */ }
  }
  return name
}

export function setGuestName(name: string): void {
  const clean = name.trim().slice(0, 40)
  try { localStorage.setItem(NAME_KEY, clean || getGuestName()) } catch { /* ignore */ }
}
