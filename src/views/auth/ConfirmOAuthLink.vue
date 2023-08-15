<script setup lang="ts">
import { ref, onMounted } from 'vue'
import useAuthStore from '@/stores/auth'

const props = defineProps<{
  token: string
}>()

const error = ref(null as null|string)
const authStore = useAuthStore()

onMounted(async () => {
  error.value = await authStore.confirmOAuthLink(props.token)
})
</script>

<template lang="pug">
.loading(v-if="error === null") Just checking a few things...
.error(v-else) {{ error }}
</template>

<style scoped lang="stylus">
.error
  text-align center
  font-size 1.3rem
</style>
