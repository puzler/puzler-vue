import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockQuery, mockMutate, mockClearStore } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockMutate: vi.fn(),
  mockClearStore: vi.fn(),
}))

vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { query: mockQuery, mutate: mockMutate, clearStore: mockClearStore },
}))

import { useAuthStore } from './auth'
import { ApiError } from '@/utils/api'
import { UserRoleEnum } from '@/graphql/generated/types'

const ME = {
  id: '1',
  email: 'user@example.com',
  username: 'user1',
  displayName: 'User One',
  avatarUrl: null,
  bio: null,
  role: UserRoleEnum.User,
  passwordSet: true,
  oauthConnections: [],
}

function mockFetchResponse({
  ok = true,
  status = 200,
  authHeader,
  body = {},
}: {
  ok?: boolean
  status?: number
  authHeader?: string
  body?: unknown
}) {
  return {
    ok,
    status,
    headers: { get: (name: string) => (name === 'Authorization' ? (authHeader ?? null) : null) },
    json: async () => body,
  } as unknown as Response
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.restoreAllMocks()
    mockQuery.mockReset()
    mockMutate.mockReset()
    mockClearStore.mockReset()
  })

  describe('login', () => {
    it('stores the stripped token and fetches the user', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ authHeader: 'Bearer tok123' })),
      )
      mockQuery.mockResolvedValue({ data: { me: ME } })

      const auth = useAuthStore()
      await auth.login('user@example.com', 'password123')

      expect(auth.token).toBe('tok123')
      expect(localStorage.getItem('puzler_token')).toBe('tok123')
      expect(auth.user?.username).toBe('user1')
      expect(auth.isAuthenticated).toBe(true)
    })

    it('throws ApiError with server messages on bad credentials', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          mockFetchResponse({ ok: false, status: 401, body: { error: 'Invalid Email or password.' } }),
        ),
      )

      const auth = useAuthStore()
      await expect(auth.login('user@example.com', 'wrong')).rejects.toMatchObject({
        status: 401,
        errors: ['Invalid Email or password.'],
      })
      expect(auth.isAuthenticated).toBe(false)
      expect(localStorage.getItem('puzler_token')).toBeNull()
    })
  })

  describe('signup', () => {
    it('adopts the dispatched token', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(mockFetchResponse({ status: 201, authHeader: 'Bearer fresh' })),
      )
      mockQuery.mockResolvedValue({ data: { me: ME } })

      const auth = useAuthStore()
      await auth.signup('user1', 'user@example.com', 'password123')

      expect(auth.token).toBe('fresh')
      expect(auth.user?.username).toBe('user1')
    })
  })

  describe('logout', () => {
    it('clears local state even if the server call fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

      const auth = useAuthStore()
      auth.setToken('tok123')
      await auth.logout()

      expect(auth.token).toBeNull()
      expect(auth.user).toBeNull()
      expect(localStorage.getItem('puzler_token')).toBeNull()
      expect(mockClearStore).toHaveBeenCalled()
    })
  })

  describe('fetchCurrentUser', () => {
    it('clears auth when the token no longer resolves to a user', async () => {
      mockQuery.mockResolvedValue({ data: { me: null } })

      const auth = useAuthStore()
      auth.setToken('stale')
      await auth.fetchCurrentUser()

      expect(auth.token).toBeNull()
      expect(localStorage.getItem('puzler_token')).toBeNull()
    })
  })

  describe('changePassword', () => {
    it('stores the rotated token on success', async () => {
      mockMutate.mockResolvedValue({
        data: { changePassword: { user: ME, token: 'rotated', errors: [] } },
      })

      const auth = useAuthStore()
      auth.setToken('old')
      await auth.changePassword('newpassword', 'oldpassword')

      expect(auth.token).toBe('rotated')
      expect(localStorage.getItem('puzler_token')).toBe('rotated')
    })

    it('throws ApiError with mutation errors', async () => {
      mockMutate.mockResolvedValue({
        data: { changePassword: { user: null, token: null, errors: ['Current password is incorrect'] } },
      })

      const auth = useAuthStore()
      await expect(auth.changePassword('newpassword', 'wrong')).rejects.toMatchObject({
        errors: ['Current password is incorrect'],
      })
      expect(auth.token).toBeNull()
    })
  })

  describe('disconnectProvider', () => {
    it('updates the user on success', async () => {
      const updated = { ...ME, oauthConnections: [] }
      mockMutate.mockResolvedValue({
        data: { disconnectOauthProvider: { user: updated, errors: [] } },
      })

      const auth = useAuthStore()
      await auth.disconnectProvider('google')

      expect(auth.user).toEqual(updated)
    })

    it('throws the last-sign-in-method guard error', async () => {
      mockMutate.mockResolvedValue({
        data: {
          disconnectOauthProvider: {
            user: null,
            errors: ["You can't remove your last way to sign in. Set a password first."],
          },
        },
      })

      const auth = useAuthStore()
      await expect(auth.disconnectProvider('google')).rejects.toBeInstanceOf(ApiError)
    })
  })

  describe('connectProvider', () => {
    it('redirects to the prepared OAuth URL', async () => {
      mockMutate.mockResolvedValue({
        data: { prepareOauthConnect: { url: 'http://api/users/auth/google_oauth2?connect_token=x', errors: [] } },
      })
      const location = { href: '' }
      vi.stubGlobal('location', location)

      const auth = useAuthStore()
      await auth.connectProvider('google')

      expect(location.href).toBe('http://api/users/auth/google_oauth2?connect_token=x')
    })
  })

  describe('deleteAccount', () => {
    it('clears auth on success', async () => {
      mockMutate.mockResolvedValue({ data: { deleteAccount: { success: true, errors: [] } } })

      const auth = useAuthStore()
      auth.setToken('tok')
      await auth.deleteAccount({ currentPassword: 'password123' })

      expect(auth.token).toBeNull()
      expect(localStorage.getItem('puzler_token')).toBeNull()
      expect(mockClearStore).toHaveBeenCalled()
    })

    it('throws ApiError and keeps the session on failure', async () => {
      mockMutate.mockResolvedValue({
        data: { deleteAccount: { success: false, errors: ['Current password is incorrect'] } },
      })

      const auth = useAuthStore()
      auth.setToken('tok')
      await expect(auth.deleteAccount({ currentPassword: 'wrong' })).rejects.toMatchObject({
        errors: ['Current password is incorrect'],
      })
      expect(auth.token).toBe('tok')
    })
  })

  describe('downloadData', () => {
    it('fetches the export and triggers a download', async () => {
      const blob = new Blob(['{}'], { type: 'application/json' })
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: { get: () => null },
          blob: async () => blob,
        } as unknown as Response),
      )
      const click = vi.fn()
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click,
        remove: vi.fn(),
      } as unknown as HTMLAnchorElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n)
      vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() })

      const auth = useAuthStore()
      auth.setToken('tok')
      await auth.downloadData()

      expect(click).toHaveBeenCalled()
    })
  })
})
