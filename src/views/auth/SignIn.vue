<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Facebook, Google } from '@/types/auth-providers';
import router from '@/plugins/router'
import useAuthStore from '@/stores/auth';
import { onUnmounted } from 'vue';

const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const passwordVisible = ref(false)

const signUp = ref(false)
const signInLoading = ref(false)
const error = ref(null as string|null)
const watchingForAuthReturn = ref(false)

onUnmounted(() => {
  if (watchingForAuthReturn.value) {
    document.removeEventListener('visibilitychange', checkForAuthReturn)
  }
})

async function handleSubmit() {
  signInLoading.value = true
  error.value = null

  let errorMsg
  if (signUp.value) {
    errorMsg = await authStore.signUp({
      email: email.value,
      password: password.value,
    })
  } else {
    errorMsg = await authStore.signIn({
      email: email.value,
      password: password.value,
    })
  }

  signInLoading.value = false

  if (authStore.currentUser) {
    router.replace('/')
  } else {
    error.value = errorMsg
  }
}

const authProviders = [
  {
    name: 'Facebook',
    icon: 'fa:fab fa-facebook-square',
    color: '#3B5998',
    textColor: '#ffffff',
    provider: Facebook,
  },
  {
    name: 'Google',
    icon: 'mdi-gmail',
    color: '#d52b1c',
    textColor: '#ffffff',
    provider: Google,
  },
]

function attemptProviderAuth({ redirectUrl }: { redirectUrl: Function }) {
  error.value = null
  window.open(redirectUrl(), '_blank')
  watchingForAuthReturn.value = true
  document.addEventListener('visibilitychange', checkForAuthReturn)
}

async function checkForAuthReturn() {
  if (document.visibilityState === 'visible') {
    watchingForAuthReturn.value = false
    document.removeEventListener('visibilitychange', checkForAuthReturn)

    await authStore.refreshFromStorage()
    if (await authStore.authenticated) return

    error.value = "Your OAuth sign in didn't work. Try again later."
  }
}
</script>

<template lang="pug">
.sign-in-form
  .form-header Sign In
  .error(v-if="error !== null") {{ error }}
  v-text-field.form-field(
    label="Email"
    name="email"
    v-model="email"
    prepend-inner-icon="mdi-email"
    variant="outlined"
    v-on:keypress.enter="handleSubmit"
  )
  v-text-field.form-field(
    label="Password"
    name="password"
    :type="passwordVisible ? 'text' : 'password'"
    v-model="password"
    prepend-inner-icon="mdi-lock"
    :append-inner-icon="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
    @click:append-inner="passwordVisible = !passwordVisible"
    variant="outlined"
    v-on:keypress.enter="handleSubmit"
  )
    template(v-slot:details)
      RouterLink.forgot-password-link(
        v-if="!signUp"
        to="/auth/forgot-password"
      ) Forgot Password?
  v-btn.sign-in-btn(
    v-on:click="handleSubmit"
    color="blue-grey"
    size="large"
    :loading="signInLoading"
  ) {{ signUp ? 'Sign Up' : 'Sign In' }}
  a.sign-up-link(
    v-on:click.stop="signUp = !signUp"
    href="#"
  ) {{ signUp ? 'Sign In' : 'Sign Up' }}
  .omni-auth(v-if="authProviders.length")
    .separator OR
    v-btn.auth-provider-btn(
      v-for="authProvider in authProviders"
      v-on:click="attemptProviderAuth(authProvider.provider)"
      :key="authProvider.name"
      :prepend-icon="authProvider.icon"
      :color="authProvider.color"
      :style="{ '--v-theme-on-surface': authProvider.textColor }"
    ) Login with {{ authProvider.name }}
</template>

<style scoped lang="stylus">
.sign-in-form
  display flex
  flex-direction column
  align-items stretch
  justify-content start
  width 100%

  .form-field
    :deep(.v-field)
      border-radius 30px
      .v-field__outline .v-field__outline__start
        flex 0 0 30px

  .form-header
    text-align center
    font-size 2.5rem
    margin-bottom 40px
    line-height 1

  .error
    background-color #e64444
    font-size 1.1rem
    padding 5px 15px
    text-align center
    color white
    margin-bottom 15px
    border-radius 10px

  .sign-in-btn
    margin 40px
    margin-bottom 0
    border-radius 10px
    font-size 1.2rem

  .sign-up-link
    margin 10px auto 0
    padding 5px 10px

  .omni-auth
    display flex
    flex-direction column
    align-items center
    .separator
      display flex
      align-self stretch
      align-items center
      text-align center
      padding 0 20px
      margin 20px 5px
      
      &::before
      &::after
        content: ''
        flex 1
        border-bottom 1px solid #cdcdcd
        margin 0 .25em

    .auth-provider-btn
      --v-high-emphasis-opacity 100%
      --v-btn-height unset
      width 70%
      padding-left 0
      margin-top 10px
      justify-content space-between
      overflow hidden
      color var(--v-theme-on-surface)
      &:first-of-type
        margin-top 0
      :deep(.v-btn__prepend)
        padding 10px
        font-size 1.2rem
        margin-inline-start unset
        margin-right 15px
        background-color rgba(0, 0, 0, 0.3)
</style>