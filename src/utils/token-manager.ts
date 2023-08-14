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

function fetchToken(name: string): string|null {
  const fromStorage = localStorage.getItem(storageKeyFor(name))
  if (!fromStorage) return null

  const tokenFromStorage = JSON.parse(fromStorage!)

  if (tokenFromStorage.name !== name) return null
  if (tokenFromStorage.expire < Date.now()) return null

  return tokenFromStorage.token
}

function fetchAndConsumeToken(name: string): string|null {
  const token = fetchToken(name)
  if (token) {
    localStorage.removeItem(storageKeyFor(name))
  }

  return token
}

export default {
  generateToken,
  fetchToken,
  fetchAndConsumeToken,
}
