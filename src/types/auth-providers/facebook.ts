import { useRoute } from 'vue-router'
import TokenManager from "../../utils/token-manager"
import type { AuthProvider } from './auth-provider'

const APP_ID = import.meta.env.VITE_PUZLER_FB_APP_ID
const TOKEN_NAME = 'facebook'
const BASE_URL = 'https://www.facebook.com/v17.0/dialog/oauth'
const REDIRECT_URI = `${window.location.origin}/auth/omni/facebook`

function redirectUrl(): string {
  const token = TokenManager.generateToken(TOKEN_NAME)
  return `${BASE_URL}?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&state=${JSON.stringify({token})}&scope=email`
}

function validateResponse() {
  const { state, code } = useRoute().query
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

const Facebook = {
  redirectUrl,
  validateResponse,
} as AuthProvider

export default Facebook
