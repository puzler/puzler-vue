import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ResetPasswordInput, SignInInput, SignInWithOAuthInput, SignUpInput, User } from '@/graphql/generated/types'
import graphqlClient from '@/plugins/graphql'
import router from '@/plugins/router'

import CurrentUserQuery from '@/graphql/gql/auth/queries/CurrentUser.graphql'
import SignInMutation from '@/graphql/gql/auth/mutations/SignIn.graphql'
import SignInWithOAuthMutation from '@/graphql/gql/auth/mutations/SignInWithOAuth.graphql'
import SignOutMutation from '@/graphql/gql/auth/mutations/SignOut.graphql'
// import SignOutAllLocationsMutation from '@/graphql/gql/auth/mutations/SignOutAllLocations.graphql'
import SignUpMutation from '@/graphql/gql/auth/mutations/SignUp.graphql'
import ConfirmEmailMutation from '@/graphql/gql/auth/mutations/ConfirmEmail.graphql'
import RequestPasswordResetMutation from '@/graphql/gql/auth/mutations/RequestPasswordReset.graphql'
import ResetPasswordMutation from '@/graphql/gql/auth/mutations/ResetPassword.graphql'

export const LOCAL_STORAGE_JWT_KEY = 'puzler-auth-jwt'

const useAuthStore = defineStore('auth', () => {
  const jwt = ref(localStorage.getItem(LOCAL_STORAGE_JWT_KEY))
  const currentUser = ref(null as User|null)
  const initialFetchComplete = ref(false)

  const authenticated = computed(async () => {
    if (!initialFetchComplete.value) {
      await fetchCurrentUser()
    }

    return !!currentUser.value
  })

  function clearJwt() {
    jwt.value = null
    localStorage.removeItem(LOCAL_STORAGE_JWT_KEY)
  }

  function setJwt(token: string) {
    jwt.value = token
    localStorage.setItem(LOCAL_STORAGE_JWT_KEY, token)
  }

  async function refreshFromStorage() {
    jwt.value = localStorage.getItem(LOCAL_STORAGE_JWT_KEY)
    await fetchCurrentUser()
  }

  async function fetchCurrentUser() {
    initialFetchComplete.value = true

    let responseUser = null

    if (jwt.value) {
      responseUser = (await graphqlClient.query({
        query: CurrentUserQuery,
        fetchPolicy: 'no-cache',
      })).data.me
    }

    currentUser.value = responseUser

    const currentRouteAuthRequirement = router.currentRoute.value.matched.reduce(
      (currentAuthRequirement, route) => {
        if (typeof route.meta.authenticated === 'boolean') return route.meta.authenticated
        return currentAuthRequirement
      },
      null as null|boolean,
    )

    if (currentRouteAuthRequirement !== null && currentRouteAuthRequirement !== await authenticated.value) {
      if (currentRouteAuthRequirement) {
        router.replace('/auth/sign-in')
      } else {
        router.replace('/')
      }
    }

    if (currentUser.value) return
    clearJwt()
  }

  async function handleJwtMutationResponse(
    { success, errors, jwt: responseJwt }: { success: boolean, errors?: Array<string>, jwt?: string },
    defaultError = 'Something went wrong'
  ) {
    if (success && responseJwt) {
      setJwt(responseJwt)
      await fetchCurrentUser()

      if (currentUser.value) return null

      clearJwt()
    }

    return (errors || [defaultError])[0]
  }

  async function signIn(input: SignInInput): Promise<string|null> {
    if (jwt.value) return 'You are already signed in'

    const response = await graphqlClient.mutate({
      mutation: SignInMutation,
      variables: { input },
      fetchPolicy: 'no-cache',
    })

    return handleJwtMutationResponse(response.data.signIn, 'Invalid Email or Password')
  }

  async function signInWithOAuth(input: SignInWithOAuthInput) {
    if (jwt.value) return 'You are already signed in'

    const response = await graphqlClient.mutate({
      mutation: SignInWithOAuthMutation,
      variables: { input },
      fetchPolicy: 'no-cache',
    })

    return handleJwtMutationResponse(response.data.signInWithOAuth, 'Could not validate OAuth Login')
  }

  async function signOut() {
    await graphqlClient.mutate({
      mutation: SignOutMutation,
      variables: { input: { token: jwt.value } },
    })

    await fetchCurrentUser()
  }

  // TODO: Implement this on User Settings Page
  // async function signOutAllLocations() {
  //   await graphqlClient.mutate({
  //     mutation: SignOutAllLocationsMutation,
  //     variables: { input: {} },
  //   })

  //   await fetchCurrentUser()
  // }

  async function signUp(input: SignUpInput) {
    if (jwt.value) return 'You are already signed in'

    const response = await graphqlClient.mutate({
      mutation: SignUpMutation,
      variables: { input },
      fetchPolicy: 'no-cache',
    })
    
    return handleJwtMutationResponse(response.data.signUp)
  }

  async function confirmEmail(token: string) {
    if (jwt.value) return 'You are already signed in'

    const response = await graphqlClient.mutate({
      mutation: ConfirmEmailMutation,
      variables: { input: { token } },
    })

    return handleJwtMutationResponse(response.data.confirmEmail, 'Invalid confirmation token')
  }

  async function requestPasswordReset(email: string) {
    if (jwt.value) return

    await graphqlClient.mutate({
      mutation: RequestPasswordResetMutation,
      variables: { input: { email } },
    })
  }

  async function resetPassword(input: ResetPasswordInput) {
    if (jwt.value) return 'You are already logged in'

    const response = await graphqlClient.mutate({
      mutation: ResetPasswordMutation,
      variables: { input },
    })

    return handleJwtMutationResponse(response.data.resetPassword, 'Invalid password reset token')
  }

  return {
    currentUser,
    authenticated,
    fetchCurrentUser,
    refreshFromStorage,
    signIn,
    signInWithOAuth,
    signOut,
    signUp,
    confirmEmail,
    requestPasswordReset,
    resetPassword,
  }
})

export default useAuthStore
