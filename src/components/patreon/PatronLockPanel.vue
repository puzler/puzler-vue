<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import { formatCents } from '@/utils/currency'
import { LOCK_REASON_COPY } from '@/constants/patreon'
import { PatronLockReasonEnum } from '@/graphql/generated/types'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiLockOutline, mdiOpenInNew } from '@mdi/js'

// The teaser lock card for a patrons-only puzzle or collection: says who the
// content is for and offers the one action that could unlock it for this
// viewer. Content itself never reached the client — the server withheld it.
const props = defineProps<{
  access: {
    lockedReason?: PatronLockReasonEnum | null
    requiredTierTitle?: string | null
    requiredAmountCents?: number | null
    campaignTitle?: string | null
    campaignUrl?: string | null
  }
  kind: 'puzzle' | 'collection'
  authorName: string
}>()
const emit = defineEmits<{ recheck: [] }>()

const route = useRoute()
const auth = useAuthStore()

const busy = ref(false)
const error = ref<string | null>(null)

const reason = computed(() => props.access.lockedReason ?? PatronLockReasonEnum.NotPatron)
const copy = computed(() => LOCK_REASON_COPY[reason.value])

const requirement = computed(() => {
  if (props.access.requiredTierTitle) return `Requires the ${props.access.requiredTierTitle} tier or above.`
  if (props.access.requiredAmountCents) {
    return `Requires a pledge of ${formatCents(props.access.requiredAmountCents)} or more.`
  }
  return null
})

// Which call to action can actually help. Joining Patreon can't unlock a
// back-catalog release, so that state gets no become-a-patron button.
const showLogin = computed(() => !auth.isAuthenticated)
const showConnect = computed(
  () => auth.isAuthenticated && reason.value === PatronLockReasonEnum.NotLinked,
)
const showBecomePatron = computed(
  () =>
    !!props.access.campaignUrl &&
    reason.value !== PatronLockReasonEnum.JoinedAfterRelease &&
    reason.value !== PatronLockReasonEnum.CreatorUnavailable,
)
const showRecheck = computed(
  () => auth.isAuthenticated && reason.value !== PatronLockReasonEnum.NotLinked,
)

async function connectPatreon() {
  error.value = null
  busy.value = true
  try {
    // The OAuth flow lands back on Settings; remember where the viewer was so
    // it can bounce them back to this page.
    sessionStorage.setItem('puzler:patreonReturnTo', route.fullPath)
    await auth.connectProvider('patreon', 'patron')
  } catch (e) {
    busy.value = false
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  }
}

async function recheck() {
  error.value = null
  busy.value = true
  try {
    await auth.refreshPatreonMemberships()
    emit('recheck')
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="max-w-xl mx-auto w-full bg-paper border border-line rounded-xl p-6 flex flex-col items-center text-center gap-3">
    <span class="w-12 h-12 rounded-full bg-action-tint flex items-center justify-center">
      <MdiIcon
        :path="mdiLockOutline"
        :size="24"
        class="text-action"
      />
    </span>

    <div>
      <h2 class="font-display text-lg font-semibold text-ink-text">
        {{ copy.heading }}
      </h2>
      <p class="mt-1 text-sm text-soft">
        This {{ kind }} is for {{ authorName }}'s patrons.
        {{ copy.body }}
      </p>
      <p
        v-if="requirement"
        class="mt-1 text-sm font-medium text-ink-text"
      >
        {{ requirement }}
      </p>
    </div>

    <p
      v-if="error"
      class="text-xs text-red-700"
    >
      {{ error }}
    </p>

    <div class="flex flex-col sm:flex-row items-center gap-2">
      <RouterLink
        v-if="showLogin"
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
        class="px-4 py-2 rounded-lg bg-action text-on-action text-sm font-medium hover:bg-action-deep transition-colors"
      >
        Log in to check your access
      </RouterLink>

      <button
        v-if="showConnect"
        type="button"
        :disabled="busy"
        class="px-4 py-2 rounded-lg bg-action text-on-action text-sm font-medium hover:bg-action-deep transition-colors disabled:opacity-50"
        @click="connectPatreon"
      >
        Connect Patreon
      </button>

      <a
        v-if="showBecomePatron"
        :href="access.campaignUrl!"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="showConnect ? 'border border-line text-soft hover:bg-line/60' : 'bg-action text-on-action hover:bg-action-deep'"
      >
        Become a patron
        <MdiIcon
          :path="mdiOpenInNew"
          :size="14"
        />
      </a>

      <button
        v-if="showRecheck"
        type="button"
        :disabled="busy"
        class="px-4 py-2 rounded-lg text-sm border border-line text-soft hover:bg-line/60 transition-colors disabled:opacity-50"
        @click="recheck"
      >
        {{ busy ? 'Checking…' : 'Re-check access' }}
      </button>
    </div>
  </section>
</template>
