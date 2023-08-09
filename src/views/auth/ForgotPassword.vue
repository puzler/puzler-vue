<script setup lang="ts">
import { ref } from 'vue'
import useAuthStore from '@/stores/auth';

const email = ref('')
const authStore = useAuthStore()
const displayMessage = ref(false)
const loading = ref(false)

async function handleSubmit () {
  loading.value = true
  await authStore.requestPasswordReset(email.value)
  loading.value = false

  displayMessage.value = true
  setTimeout(() => {
    displayMessage.value = false
  }, 6000)
}
</script>

<template lang="pug">
.forgot-password-form
  .form-header Forgot Password
  .reset-instructions-message(
    v-if="displayMessage"
  ) Check your email for instructions on resetting your password
  v-text-field.form-field(
    label="Email"
    name="email"
    v-model="email"
    prepend-inner-icon="mdi-email"
    variant="outlined"
    v-on:keypress.enter="handleSubmit"
  )
    template(v-slot:details)
      RouterLink.sign-in-link(
        to="/auth/sign-in"
      ) Back to Sign In
  v-btn.submit-btn(
    v-on:click="handleSubmit"
    color="blue-grey"
    size="large"
    :loading="loading"
  ) Reset Password
</template>

<style scoped lang="stylus">
.forgot-password-form
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

  .reset-instructions-message
    background-color #28a63c
    font-size 1.3rem
    padding 5px 15px
    text-align center
    color white
    margin-bottom 15px
    border-radius 10px

  .submit-btn
    margin 40px
    margin-bottom 0
    border-radius 10px
    font-size 1.2rem
</style>
