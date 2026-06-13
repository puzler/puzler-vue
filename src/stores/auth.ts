import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { apiFetch, ApiError } from '@/utils/api'
import * as tokenStorage from '@/utils/tokenStorage'
import MeDocument from '@/graphql/gql/auth/queries/Me.graphql'
import UpdateProfileDocument from '@/graphql/gql/auth/mutations/UpdateProfile.graphql'
import ChangePasswordDocument from '@/graphql/gql/auth/mutations/ChangePassword.graphql'
import DisconnectOauthProviderDocument from '@/graphql/gql/auth/mutations/DisconnectOauthProvider.graphql'
import PrepareOauthConnectDocument from '@/graphql/gql/auth/mutations/PrepareOauthConnect.graphql'
import DeleteAccountDocument from '@/graphql/gql/auth/mutations/DeleteAccount.graphql'
import type {
  MeQuery,
  UserFieldsFragment,
  UpdateProfileMutation,
  UpdateProfileMutationVariables,
  ChangePasswordMutation,
  ChangePasswordMutationVariables,
  DisconnectOauthProviderMutation,
  DisconnectOauthProviderMutationVariables,
  PrepareOauthConnectMutation,
  PrepareOauthConnectMutationVariables,
  DeleteAccountMutation,
  DeleteAccountMutationVariables,
} from '@/graphql/generated/types'

export type User = UserFieldsFragment
export type OauthProvider = 'google' | 'patreon'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Identity provider names → Devise/OmniAuth route segments.
const PROVIDER_ROUTES: Record<OauthProvider, string> = {
  google: 'google_oauth2',
  patreon: 'patreon',
}

function tokenFromResponse(response: Response): string | null {
  return response.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
}

// Single owner of the session: token, user object, and every auth action.
// Components never touch localStorage, build OAuth URLs, or call auth
// endpoints directly — they go through this store.
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(tokenStorage.getToken())

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setToken(newToken: string) {
    token.value = newToken
    tokenStorage.setToken(newToken)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    tokenStorage.clearToken()
    apolloClient.clearStore()
  }

  async function fetchCurrentUser() {
    if (!token.value) return
    try {
      const { data } = await apolloClient.query<MeQuery>({
        query: MeDocument,
        fetchPolicy: 'network-only',
      })
      user.value = data.me
      if (!data.me) clearAuth()
    } catch {
      clearAuth()
    }
  }

  async function adoptToken(response: Response) {
    const newToken = tokenFromResponse(response)
    if (!newToken) throw new ApiError(response.status, ['No token in response'])
    setToken(newToken)
    await fetchCurrentUser()
  }

  // --- Session ---

  async function login(email: string, password: string) {
    const response = await apiFetch('/users/sign_in', {
      method: 'POST',
      body: { user: { email, password } },
    })
    await adoptToken(response)
  }

  async function signup(username: string, email: string, password: string) {
    const response = await apiFetch('/users', {
      method: 'POST',
      body: { user: { username, email, password } },
    })
    await adoptToken(response)
  }

  async function logout() {
    try {
      await apiFetch('/users/sign_out', { method: 'DELETE' })
    } catch {
      // Revocation is best-effort — clear the local session regardless.
    }
    clearAuth()
  }

  function handleOAuthToken(newToken: string) {
    setToken(newToken)
    return fetchCurrentUser()
  }

  // --- Password ---

  async function forgotPassword(email: string) {
    await apiFetch('/users/password', { method: 'POST', body: { user: { email } } })
  }

  async function resetPassword(resetToken: string, password: string) {
    await apiFetch('/users/password', {
      method: 'PUT',
      body: {
        user: {
          reset_password_token: resetToken,
          password,
          password_confirmation: password,
        },
      },
    })
  }

  async function changePassword(newPassword: string, currentPassword?: string) {
    const { data } = await apolloClient.mutate<ChangePasswordMutation, ChangePasswordMutationVariables>({
      mutation: ChangePasswordDocument,
      variables: { newPassword, currentPassword },
    })
    const result = data?.changePassword
    if (!result || result.errors.length > 0) {
      throw new ApiError(422, result?.errors ?? ['Something went wrong'])
    }
    // Changing the password revoked every JWT; adopt the fresh one.
    if (result.token) setToken(result.token)
    if (result.user) user.value = result.user
  }

  // --- OAuth ---

  function loginWithProvider(provider: OauthProvider) {
    window.location.href = `${API_URL}/users/auth/${PROVIDER_ROUTES[provider]}`
  }

  async function connectProvider(provider: OauthProvider) {
    const { data } = await apolloClient.mutate<PrepareOauthConnectMutation, PrepareOauthConnectMutationVariables>({
      mutation: PrepareOauthConnectDocument,
      variables: { provider },
    })
    const result = data?.prepareOauthConnect
    if (!result?.url) {
      throw new ApiError(422, result?.errors ?? ['Something went wrong'])
    }
    window.location.href = result.url
  }

  async function disconnectProvider(provider: OauthProvider) {
    const { data } = await apolloClient.mutate<DisconnectOauthProviderMutation, DisconnectOauthProviderMutationVariables>({
      mutation: DisconnectOauthProviderDocument,
      variables: { provider },
    })
    const result = data?.disconnectOauthProvider
    if (!result || result.errors.length > 0) {
      throw new ApiError(422, result?.errors ?? ['Something went wrong'])
    }
    if (result.user) user.value = result.user
  }

  // --- Profile (the store owns `user`, so user-mutating actions live here) ---

  async function updateProfile(attrs: { username?: string; bio?: string }) {
    const { data } = await apolloClient.mutate<UpdateProfileMutation, UpdateProfileMutationVariables>({
      mutation: UpdateProfileDocument,
      variables: attrs,
    })
    const result = data?.updateProfile
    if (!result || result.errors.length > 0) {
      throw new ApiError(422, result?.errors ?? ['Something went wrong'])
    }
    if (result.user) user.value = result.user
  }

  async function uploadAvatar(file: Blob, filename = 'avatar') {
    const formData = new FormData()
    formData.append('avatar', file, filename)
    await apiFetch('/me/avatar', { method: 'PUT', body: formData })
    await fetchCurrentUser()
  }

  async function removeAvatar() {
    await apiFetch('/me/avatar', { method: 'DELETE' })
    await fetchCurrentUser()
  }

  // --- Data rights (GDPR) ---

  async function downloadData() {
    const response = await apiFetch('/me/export')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `puzler-data-${user.value?.username ?? 'export'}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function deleteAccount(opts: { currentPassword?: string; confirmation?: string }) {
    const { data } = await apolloClient.mutate<DeleteAccountMutation, DeleteAccountMutationVariables>({
      mutation: DeleteAccountDocument,
      variables: { currentPassword: opts.currentPassword, confirmation: opts.confirmation },
    })
    const result = data?.deleteAccount
    if (!result?.success) {
      throw new ApiError(422, result?.errors ?? ['Something went wrong'])
    }
    clearAuth()
  }

  return {
    user,
    token,
    isAuthenticated,
    setToken,
    clearAuth,
    fetchCurrentUser,
    login,
    signup,
    logout,
    handleOAuthToken,
    forgotPassword,
    resetPassword,
    changePassword,
    loginWithProvider,
    connectProvider,
    disconnectProvider,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    downloadData,
    deleteAccount,
  }
})
