import crypto from 'crypto-js'

const TOKEN_STORE_PREFIX = 'puzler-token'
const storageKeyFor = (name: string) => `${TOKEN_STORE_PREFIX}-${name}`

function generateToken(name: string) {
  const token = crypto.lib.WordArray.random(48).toString()
  const expire = Date.now() + (1000*60*30) // 30 minutes
  localStorage.setItem(
    storageKeyFor(name),
    JSON.stringify({
      name,
      token,
      expire,
    }),
  )

  return token
}

function validateToken(name: string, token: string): boolean {
  const fromStorage = localStorage.getItem(storageKeyFor(name))
  if (!fromStorage) return false

  const tokenFromStorage = JSON.parse(fromStorage!)

  if (tokenFromStorage.name !== name) return false
  if (tokenFromStorage.token !== token) return false
  if (tokenFromStorage.expire < Date.now()) return false

  return true
}

function validateAndConsumeToken(name: string, token: string): boolean {
  const valid = validateToken(name, token)

  if (valid) {
    localStorage.removeItem(storageKeyFor(name))
  }

  return valid
}

export default {
  generateToken,
  validateToken,
  validateAndConsumeToken,
}
