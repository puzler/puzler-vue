export interface AuthProvider {
  redirectUrl: () => string
  validateResponse: () => { code?: string, valid: boolean }
}
