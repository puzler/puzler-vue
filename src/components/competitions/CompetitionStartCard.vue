<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ConfirmModal from '@/components/ConfirmModal.vue'

// The commitment point: signed-in solvers confirm their single attempt;
// guests get routed to sign in first.
defineProps<{ ready: boolean }>()
const emit = defineEmits<{ start: [] }>()

const auth = useAuthStore()
const route = useRoute()
const confirming = ref(false)
</script>

<template>
  <div class="mt-4">
    <template v-if="auth.isAuthenticated">
      <button
        class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-action text-on-action font-medium hover:bg-action-deep disabled:opacity-50"
        :disabled="!ready"
        @click="confirming = true"
      >
        Start the competition
      </button>
      <p
        v-if="!ready"
        class="text-xs text-faint mt-1.5"
      >
        The author hasn't finished setting up this competition yet.
      </p>
    </template>
    <RouterLink
      v-else
      :to="{ name: 'login', query: { redirect: route.fullPath } }"
      class="inline-block px-5 py-2.5 rounded-xl bg-action text-on-action font-medium hover:bg-action-deep"
    >
      Sign in to compete
    </RouterLink>

    <ConfirmModal
      v-if="confirming"
      message="You get one attempt, and the clock starts the moment you confirm. Ready?"
      confirm-label="Start my run"
      @confirm="confirming = false; emit('start')"
      @cancel="confirming = false"
    />
  </div>
</template>
