<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import { formatCents } from '@/utils/currency'
import PatreonCreatorCard from './PatreonCreatorCard.vue'

// Patreon standing inside the Connections section: re-auth prompts, the
// creator card (campaign + teaser toggle), supported creators, and sync.
const auth = useAuthStore()

const error = ref<string | null>(null)
const syncing = ref(false)

const capabilities = computed(() => auth.user?.patreon?.capabilities ?? null)
const memberships = computed(() =>
  auth.patronMemberships.filter((m) => m.patronStatus === 'ACTIVE_PATRON'),
)

const lastSynced = computed(() => {
  const value = auth.patreonCampaign?.campaignSyncedAt
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString()
})

async function run(action: () => Promise<void>) {
  error.value = null
  syncing.value = true
  try {
    await action()
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  } finally {
    syncing.value = false
  }
}

function syncNow() {
  return run(async () => {
    if (capabilities.value?.creator) await auth.syncPatreonCampaign()
    await auth.refreshPatreonMemberships()
  })
}

function enablePatronFeatures() {
  return run(() => auth.connectProvider('patreon', 'patron'))
}

function enableCreatorFeatures() {
  return run(() => auth.connectProvider('patreon', 'creator'))
}
</script>

<template>
  <div class="mt-1 mb-3 rounded-lg border border-line bg-surface p-4 flex flex-col gap-3">
    <div
      v-if="error"
      class="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700"
    >
      {{ error }}
    </div>

    <!-- Linked for sign-in only: the stored grant can't read memberships. -->
    <div
      v-if="auth.patreonNeedsReauth"
      class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
    >
      <p class="flex-1 text-xs text-soft">
        Patreon is linked for sign-in only. Reconnect to unlock patron features, like seeing
        releases from the creators you support.
      </p>
      <button
        type="button"
        class="self-start px-3 py-1.5 rounded-lg text-sm bg-action text-on-action font-medium hover:bg-action-deep transition-colors"
        @click="enablePatronFeatures"
      >
        Enable patron features
      </button>
    </div>

    <template v-else>
      <PatreonCreatorCard v-if="auth.patreonCampaign" />

      <!-- Creator upgrade prompt: patron scopes granted, creator scopes not. -->
      <div
        v-else-if="capabilities && !capabilities.creator"
        class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
      >
        <p class="flex-1 text-xs text-soft">
          Run a Patreon campaign? Reconnect with creator access to share puzzles with your patrons.
        </p>
        <button
          type="button"
          class="self-start px-3 py-1.5 rounded-lg text-sm border border-line text-soft hover:bg-line/60 transition-colors"
          @click="enableCreatorFeatures"
        >
          Enable creator features
        </button>
      </div>

      <!-- Patron block -->
      <div v-if="memberships.length">
        <p class="text-sm text-ink-text">
          Supporting {{ memberships.length }} {{ memberships.length === 1 ? 'creator' : 'creators' }}
        </p>
        <ul class="mt-1 flex flex-col gap-0.5">
          <li
            v-for="membership in memberships"
            :key="membership.id"
            class="text-xs text-faint"
          >
            {{ membership.campaign.title || membership.campaign.creatorUsername || 'A creator' }}
            · {{ formatCents(membership.entitledAmountCents, membership.campaign.currency) }}/mo
          </li>
        </ul>
      </div>

      <div class="flex items-center gap-3 pt-1 border-t border-line">
        <button
          type="button"
          :disabled="syncing"
          class="px-3 py-1.5 rounded-lg text-sm border border-line text-soft hover:bg-line/60 transition-colors disabled:opacity-50"
          @click="syncNow"
        >
          {{ syncing ? 'Syncing…' : 'Sync now' }}
        </button>
        <span
          v-if="lastSynced"
          class="text-xs text-faint"
        >Last synced {{ lastSynced }}</span>
      </div>
    </template>
  </div>
</template>
