import { useRoute } from 'vue-router'
import AuthProvider from './auth-provider'

const APP_ID = import.meta.env.VITE_PUZLER_FB_APP_ID
const BASE_URL = 'https://www.facebook.com/v17.0/dialog/oauth'
const REDIRECT_URI = `${window.location.origin}/auth/omni/facebook`

const Facebook = new AuthProvider({
  name: 'Facebook',
  redirectUrl: (csrfToken: string) => {
    const params = {
      client_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      state: JSON.stringify({csrfToken}),
      scope: 'email'
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

    return {
      code,
      csrfToken: csrfToken
    }
  }
})

export default Facebook
