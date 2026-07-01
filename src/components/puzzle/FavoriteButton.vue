<script setup lang="ts">
import { ref } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiHeart, mdiHeartOutline } from '@mdi/js'
import ToggleFavoriteDocument from '@/graphql/gql/social/mutations/ToggleFavorite.graphql'
import type { ToggleFavoriteMutation, ToggleFavoriteMutationVariables } from '@/graphql/generated/types'

// Heart toggle that favorites/unfavorites a puzzle via ToggleFavorite. Self-managed
// (optimistic, reconciled from the server's authoritative count). Callers gate
// visibility to authenticated users and pass styling via class; `changed` lets a
// parent keep a nearby favorite count in sync.
const props = defineProps<{
  puzzleId: string
  isFavorited: boolean
  favoriteCount: number
  showLabel?: boolean
  size?: number
}>()

const emit = defineEmits<{ changed: [{ isFavorited: boolean; favoriteCount: number }] }>()

const favorited = ref(props.isFavorited)
const count = ref(props.favoriteCount)
const busy = ref(false)

async function toggle() {
  if (busy.value) return
  busy.value = true
  const prevFav = favorited.value
  const prevCount = count.value
  // Optimistic flip so the heart responds instantly.
  favorited.value = !prevFav
  count.value = prevCount + (favorited.value ? 1 : -1)
  try {
    const { data } = await apolloClient.mutate<ToggleFavoriteMutation, ToggleFavoriteMutationVariables>({
      mutation: ToggleFavoriteDocument,
      variables: { puzzleId: props.puzzleId },
    })
    if (data?.toggleFavorite) {
      favorited.value = data.toggleFavorite.isFavorited
      count.value = data.toggleFavorite.favoriteCount
    }
    emit('changed', { isFavorited: favorited.value, favoriteCount: count.value })
  } catch {
    favorited.value = prevFav
    count.value = prevCount
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="favorited"
    :title="favorited ? 'Remove from favorites' : 'Add to favorites'"
    :disabled="busy"
    @click="toggle"
  >
    <MdiIcon
      :path="favorited ? mdiHeart : mdiHeartOutline"
      :size="size ?? 20"
      :class="favorited ? 'text-red-500' : ''"
    />
    <span
      v-if="showLabel"
      class="text-sm font-medium"
    >{{ favorited ? 'Favorited' : 'Favorite' }}</span>
  </button>
</template>
