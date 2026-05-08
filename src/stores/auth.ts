import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import { gql } from '@apollo/client/core'

interface User {
  id: string
  email: string
  username: string
  avatarUrl: string | null
  bio: string | null
  role: string
}

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
      avatarUrl
      bio
      role
    }
  }
`

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('puzler_token'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('puzler_token', newToken)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem('puzler_token')
    apolloClient.clearStore()
  }

  async function fetchCurrentUser() {
    if (!token.value) return
    try {
      const { data } = await apolloClient.query({ query: ME_QUERY, fetchPolicy: 'network-only' })
      user.value = data.me
      if (!data.me) clearAuth()
    } catch {
      clearAuth()
    }
  }

  function handleOAuthToken(newToken: string) {
    setToken(newToken)
    return fetchCurrentUser()
  }

  return { user, token, isAuthenticated, setToken, clearAuth, fetchCurrentUser, handleOAuthToken }
})
