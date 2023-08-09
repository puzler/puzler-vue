import type { LocationQuery } from "vue-router"

export interface AuthProvider {
  redirectUrl: () => string
  validateResponse: (state: LocationQuery) => { code?: string, valid: boolean }
}
