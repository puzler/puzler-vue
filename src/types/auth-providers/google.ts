import { useRoute } from 'vue-router'
import TokenManager from '../../utils/token-manager'
import type { AuthProvider } from './auth-provider'

const APP_ID = import.meta.env.VITE_PUZLER_GOOGLE_APP_ID
const TOKEN_NAME = 'google'
const BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const REDIRECT_URI = `${window.location.origin}/auth/omni/google`

function redirectUrl(): string {
  const token = TokenManager.generateToken(TOKEN_NAME)
  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ]

  return `${BASE_URL}?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&state=${JSON.stringify({token})}&scope=${scopes.join(' ')}`
}

function validateResponse() {
  const hash = useRoute().hash
  const data = hash.slice(1).split('&').reduce(
    (map, param) => {
      const [key, value] = param.split('=')
      return {
        ...map,
        [key]: value,
      }
    },
    {} as Record<string, string>
  )
  
  const {
    state,
    access_token: code,
  } = data
  if (typeof state !== 'string') return { valid: false }

  const json = JSON.parse(state)
  if (!json?.token) return { valid: false }

  const valid = TokenManager.validateAndConsumeToken(
    TOKEN_NAME,
    json.token,
  )

  if (!valid) return { valid: false }

  return {
    valid,
    code,
  }
}

const Google = {
  redirectUrl,
  validateResponse,
} as AuthProvider

export default Google
