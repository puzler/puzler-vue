import { getToken } from '@/utils/tokenStorage'

// Fetch wrapper for the Devise REST endpoints (sign in/up/out, password reset,
// avatar upload). GraphQL traffic goes through Apollo instead. Only the auth
// store should call this — components talk to the store.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  errors: string[]
  status: number

  constructor(status: number, errors: string[]) {
    super(errors.join(', ') || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

interface ApiFetchOptions {
  method?: string
  body?: Record<string, unknown> | FormData
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const headers: Record<string, string> = {}

  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body // browser sets the multipart boundary
  } else if (options.body) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  })

  if (!response.ok) {
    let errors: string[] = []
    try {
      const data = await response.json()
      errors = data.errors ?? (data.error ? [data.error] : data.message ? [data.message] : [])
    } catch {
      // non-JSON error body — fall through with empty errors
    }
    throw new ApiError(response.status, errors)
  }

  return response
}
