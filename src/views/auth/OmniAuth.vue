<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Facebook } from '@/types/auth-providers'
import useAuthStore from '@/stores/auth'

const props = defineProps<{
  providerName: string
}>()

const provider = computed(() => {
  switch (props.providerName) {
    case 'facebook':
      return Facebook
  }

  throw 'No Valid Provider Found'
})

const authStore = useAuthStore()

onMounted(async () => {
  const {
    code,
    valid,
  } = provider.value.validateResponse(useRoute().query)

  if (valid && !!code) {
    await authStore.signInWithOAuth({
      code,
      providerName: props.providerName,
    })
  }

  window.close()
})
</script>

<template lang="pug">
.loading Just checking a few things...
</template>

<style scoped lang="stylus">
</style>
