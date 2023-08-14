import AuthProvider from './auth-provider'
import { useRoute } from 'vue-router'

const APP_ID = import.meta.env.VITE_PUZLER_PATREON_APP_ID
const BASE_URL = 'https://www.patreon.com/oauth2/authorize'
const REDIRECT_URI = `${window.location.origin}/auth/omni/patreon`

const Patreon = new AuthProvider({
  name: 'Patreon',
  redirectUrl: (csrfToken: string) => {
    const params = {
      response_type: 'code',
      client_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      state: encodeURIComponent(JSON.stringify({csrfToken})),
    } as Record<string, string>

    const queryString = Object.keys(params).map(
      (key) => `${key}=${params[key]}`
    ).join('&')

    return `${BASE_URL}?${queryString}`
  },
  parseOAuthResponse: () => {
    const { code, state } = useRoute().query
    
    if (typeof code !== 'string') return
    if (typeof state !== 'string') return

    const csrfToken = JSON.parse(state)?.csrfToken
    if (typeof csrfToken !== 'string') return

    return { code, csrfToken }
  }
})

export default Patreon
