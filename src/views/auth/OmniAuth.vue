<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Google, AuthProvider, Patreon } from '@/types/auth-providers'
import useAuthStore from '@/stores/auth'

const props = defineProps<{
  providerName: string
}>()

const provider = computed((): AuthProvider => {
  switch (props.providerName) {
    // case 'facebook':
    //   return Facebook
    case 'google': 
      return Google
    case 'patreon':
      return Patreon
  }

  throw 'No Valid Provider Found'
})

const authStore = useAuthStore()

onMounted(async () => {
  console.log(1)
  const signInInput = provider.value.signInInput()
  console.log(signInInput)

  if (signInInput) {
    await authStore.signInWithOAuth(signInInput)
  }

  window.close()
})
</script>

<template lang="pug">
.loading Just checking a few things...
</template>

<style scoped lang="stylus">
</style>
