<script setup lang="ts">
import { ref } from 'vue'
import useAuthStore from '@/stores/auth';

const props = defineProps<{
  token: string
}>()

const authStore = useAuthStore()

const password = ref('')
const viewPassword = ref(false)
const errorMsg = ref(null as string|null)
const loading = ref(false)

async function handleSubmit () {
  loading.value = true
  errorMsg.value = await authStore.resetPassword({
    token: props.token,
    password: password.value,
  })
  loading.value = false
}
</script>

<template lang="pug">
.reset-password-form
  .form-header Reset Password
  .error(
    v-if="errorMsg !== null"
  ) {{ errorMsg }}
  v-text-field.form-field(
    label="New Password"
    :type="viewPassword ? 'text' : 'password'"
    name="password"
    :append-inner-icon="viewPassword ? 'mdi-eye-off' : 'mdi-eye'"
    @click:append-inner="viewPassword = !viewPassword"
    v-model="password"
    :hide-details="true"
    prepend-inner-icon="mdi-lock"
    variant="outlined"
    v-on:keypress.enter="handleSubmit"
  )
  v-btn.submit-btn(
    v-on:click="handleSubmit"
    color="blue-grey"
    size="large"
    :loading="loading"
  ) Reset Password
</template>

<style scoped lang="stylus">
.reset-password-form
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
