<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'

// The creator half of the Patreon settings card: campaign summary, link
// health, and the teaser toggle. Split from PatreonStatusCard to keep both
// templates lean.
const auth = useAuthStore()

const error = ref<string | null>(null)
const savingTeasers = ref(false)

const campaign = computed(() => auth.patreonCampaign!)
const publishedTiers = computed(() => campaign.value.tiers.filter((t) => t.published && !t.discarded))

const STALE_NOTICES: Record<string, string> = {
  TOKEN_STALE: 'Patreon rejected our access. Reconnect to keep your patron content in sync.',
  DISCONNECTED: 'Patreon is disconnected. Your patron content stays locked to previously synced patrons until you reconnect.',
  REMOVED: 'We could not find your campaign on Patreon anymore.',
}

async function toggleTeasers() {
  error.value = null
  savingTeasers.value = true
  try {
    await auth.updatePatreonCampaignSettings({ teasersEnabled: !campaign.value.teasersEnabled })
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  } finally {
    savingTeasers.value = false
  }
}

async function reconnect() {
  error.value = null
  try {
    await auth.connectProvider('patreon', 'creator')
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  }
}
</script>

<template>
  <div>
    <p
      v-if="error"
      class="mb-2 text-xs text-red-700"
    >
      {{ error }}
    </p>

    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink-text truncate">
          <a
            v-if="campaign.url"
            :href="campaign.url"
            target="_blank"
            rel="noopener"
            class="hover:underline"
          >{{ campaign.title || 'Your campaign' }}</a>
          <template v-else>
            {{ campaign.title || 'Your campaign' }}
          </template>
        </p>
        <p class="text-xs text-faint">
          {{ publishedTiers.length }} {{ publishedTiers.length === 1 ? 'tier' : 'tiers' }}
          <template v-if="campaign.status !== 'ACTIVE'">
            · {{ STALE_NOTICES[campaign.status] }}
          </template>
        </p>
      </div>
      <button
        v-if="campaign.status !== 'ACTIVE'"
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-lg text-sm bg-action text-on-action font-medium hover:bg-action-deep transition-colors"
        @click="reconnect"
      >
        Reconnect
      </button>
    </div>

    <p
      v-if="publishedTiers.length === 0 && campaign.status === 'ACTIVE'"
      class="mt-1 text-xs text-faint"
    >
      No published tiers found. Publish a tier on Patreon, then sync.
    </p>

    <button
      type="button"
      role="switch"
      :aria-checked="campaign.teasersEnabled"
      :disabled="savingTeasers"
      class="mt-2 flex items-center gap-3 w-full text-left disabled:opacity-60"
      @click="toggleTeasers"
    >
      <span class="flex-1 min-w-0">
        <span class="block text-sm text-ink-text">Show locked previews to non-patrons</span>
        <span class="block text-xs text-faint leading-snug">
          When off, people who can't access your patron content won't see it exists.
        </span>
      </span>
      <span
        class="shrink-0 w-9 h-5 rounded-full p-0.5 flex transition-colors"
        :class="campaign.teasersEnabled ? 'bg-action' : 'bg-line'"
      >
        <span
          class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
          :class="campaign.teasersEnabled ? 'translate-x-4' : 'translate-x-0'"
        />
      </span>
    </button>
  </div>
</template>
