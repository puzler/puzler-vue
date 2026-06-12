// Persistence layer for the auth token. The auth store is the ONLY writer;
// everything else (Apollo links, the REST wrapper) may only read. This module
// exists so apolloClient.ts can read the token without importing the auth
// store (which itself imports apolloClient).
const TOKEN_KEY = 'puzler_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
