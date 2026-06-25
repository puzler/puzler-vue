// Single source of truth for the Rails API location. `VITE_API_URL` is inlined
// at build time (see .env.* files); the WebSocket URL for ActionCable is derived
// from it by swapping the http(s) scheme for ws(s).
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
export const WS_URL = API_URL.replace(/^http/, 'ws')
