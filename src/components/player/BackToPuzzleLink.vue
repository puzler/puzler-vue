<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiArrowLeft } from '@mdi/js'

// Link from the solver back to the puzzle's description page, forwarding the
// share token so a token-gated puzzle still resolves there. Styling is supplied
// by the caller via class; `iconOnly` swaps the label for a back arrow (mobile).
defineProps<{ iconOnly?: boolean }>()

const route = useRoute()
const to = computed(() => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  const query: Record<string, string> = {}
  if (typeof route.query.t === 'string') query.t = route.query.t
  return { name: 'puzzle', params: { id }, query }
})
</script>

<template>
  <RouterLink
    :to="to"
    title="Back to puzzle page"
    aria-label="Back to puzzle page"
  >
    <MdiIcon
      v-if="iconOnly"
      :path="mdiArrowLeft"
      :size="20"
    />
    <template v-else>
      ← Back to puzzle page
    </template>
  </RouterLink>
</template>
