<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Facebook, Google } from '@/types/auth-providers'
import useAuthStore from '@/stores/auth'

const props = defineProps<{
  providerName: string
}>()

const provider = computed(() => {
  switch (props.providerName) {
    case 'facebook':
      return Facebook
    case 'google': 
      return Google
  }

  throw 'No Valid Provider Found'
})

const authStore = useAuthStore()

onMounted(async () => {
  const {
    code,
    valid,
  } = provider.value.validateResponse()

  if (valid && !!code) {
    await authStore.signInWithOAuth({
      code,
      providerName: props.providerName,
    })
  }

  if (authStore.currentUser) window.close()
})
</script>

<template lang="pug">
.loading Just checking a few things...
</template>

<style scoped lang="stylus">
</style>
