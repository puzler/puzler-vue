<template>
  <section class="bg-paper border border-line rounded-xl p-6 mb-6">
    <h2 class="font-display text-lg font-semibold mb-1">
      Connections
    </h2>
    <p class="text-sm text-soft mb-4">
      Link Google or Patreon to sign in with one click.
    </p>

    <div
      v-if="notice"
      class="mb-4 px-4 py-3 rounded-lg bg-action-tint border border-line text-sm text-ink-text"
    >
      {{ notice }}
    </div>
    <div
      v-if="error"
      class="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
    >
      {{ error }}
    </div>

    <div class="flex flex-col divide-y divide-line">
      <div
        v-for="provider in PROVIDERS"
        :key="provider.key"
        class="flex items-center justify-between py-3"
      >
        <div>
          <p class="text-sm font-medium text-ink-text">
            {{ provider.label }}
          </p>
          <p class="text-xs text-faint">
            {{
              connectionFor(provider.key)
                ? `Connected ${formatDate(connectionFor(provider.key)!.createdAt)}`
                : 'Not connected'
            }}
          </p>
        </div>
        <button
          v-if="connectionFor(provider.key)"
          type="button"
          :disabled="!canDisconnect"
          :title="canDisconnect ? undefined : 'Set a password first so you can still sign in'"
          class="px-3 py-1.5 rounded-lg text-sm border border-line text-soft hover:bg-line/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          @click="confirmDisconnect = provider.key"
        >
          Disconnect
        </button>
        <button
          v-else
          type="button"
          class="px-3 py-1.5 rounded-lg text-sm bg-action text-on-action font-medium hover:bg-action-deep transition-colors"
          @click="connect(provider.key)"
        >
          Connect
        </button>
      </div>
    </div>

    <ConfirmModal
      v-if="confirmDisconnect"
      :message="`Disconnect ${labelFor(confirmDisconnect)}? You'll no longer be able to sign in with it.`"
      confirm-label="Disconnect"
      @confirm="disconnect(confirmDisconnect)"
      @cancel="confirmDisconnect = null"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, type OauthProvider } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import ConfirmModal from '@/components/ConfirmModal.vue'

const PROVIDERS = [
  { key: 'google' as const, label: 'Google' },
  { key: 'patreon' as const, label: 'Patreon' },
]

const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  identity_taken: 'That account is already connected to a different Puzler user.',
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const notice = ref<string | null>(null)
const error = ref<string | null>(null)
const confirmDisconnect = ref<OauthProvider | null>(null)

const canDisconnect = computed(() => {
  const connections = auth.user?.oauthConnections?.length ?? 0
  return !!auth.user?.passwordSet || connections > 1
})

function labelFor(provider: OauthProvider) {
  return PROVIDERS.find((p) => p.key === provider)?.label ?? provider
}

function connectionFor(provider: OauthProvider) {
  return auth.user?.oauthConnections?.find((c) => c.provider === provider) ?? null
}

function formatDate(value: unknown) {
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

async function connect(provider: OauthProvider) {
  error.value = null
  try {
    await auth.connectProvider(provider)
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  }
}

async function disconnect(provider: OauthProvider) {
  confirmDisconnect.value = null
  error.value = null
  try {
    await auth.disconnectProvider(provider)
    notice.value = `${labelFor(provider)} disconnected.`
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  }
}

onMounted(async () => {
  // Returning from an OAuth connect redirect: surface the outcome, refresh
  // the user (a new connection may exist), then clean the URL.
  const connected = route.query.connected as string | undefined
  const connectError = route.query.error as string | undefined

  if (connected) {
    notice.value = `${labelFor(connected as OauthProvider)} connected.`
    await auth.fetchCurrentUser()
  }
  if (connectError) {
    error.value =
      CONNECT_ERROR_MESSAGES[connectError] ?? `Connection failed: ${connectError.replaceAll('_', ' ')}`
  }
  if (connected || connectError) {
    router.replace({ query: {} })
  }
})
</script>
