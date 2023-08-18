import { useRoute } from 'vue-router'
import AuthProvider from './auth-provider'

const APP_ID = import.meta.env.VITE_PUZLER_GOOGLE_APP_ID
const BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const REDIRECT_URI = `${window.location.origin}/auth/omni/google`

const Google = new AuthProvider({
  name: 'Google',
  redirectUrl: (csrfToken: string) => {
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ]

    const params = {
      client_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      state: JSON.stringify({csrfToken}),
      scope: scopes.join(' '),
    } as Record<string, string>

    const queryString = Object.keys(params).map(
      (key) => `${key}=${params[key]}`
    ).join('&')

    return `${BASE_URL}?${queryString}`
  },
  parseOAuthResponse: () => {
    const {
      state,
      code,
    } = useRoute().query
    
    if (typeof code !== 'string') return
    if (typeof state !== 'string') return

    const csrfToken = JSON.parse(state)?.csrfToken
    if (typeof csrfToken !== 'string') return

    return {
      code,
      csrfToken,
    }
  },
})

export default Google
