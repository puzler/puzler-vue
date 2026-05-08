<template>
  <div class="min-h-screen flex items-center justify-center">
    <p class="text-gray-500">
      {{ status }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const status = ref('Signing you in...')

onMounted(async () => {
  const token = route.query.token as string | undefined
  const error = route.query.error as string | undefined

  if (error) {
    status.value = `Authentication failed: ${error}`
    setTimeout(() => router.push('/login'), 2000)
    return
  }

  if (token) {
    await auth.handleOAuthToken(token)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } else {
    status.value = 'Something went wrong.'
    setTimeout(() => router.push('/login'), 2000)
  }
})
</script>
