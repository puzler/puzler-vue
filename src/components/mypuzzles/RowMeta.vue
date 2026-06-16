<script setup lang="ts">
import { computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import MdiIcon from '@/components/MdiIcon.vue'
import ListMenu from './ListMenu.vue'
import {
  mdiContentCopy, mdiCheck, mdiEarth, mdiLinkVariant, mdiLockOutline,
  mdiFolderMultipleOutline, mdiEyeOutline,
} from '@mdi/js'

const props = defineProps<{
  kind: 'puzzle' | 'collection' | 'series'
  entityId: string
  visibility: string
  shareToken?: string | null
  // Visibility values the author may switch this entity to, in display order.
  visibilityOptions: ReadonlyArray<{ value: string; label: string }>
}>()
const emit = defineEmits<{ updateVisibility: [value: string] }>()

const { copy, copied } = useClipboard({ copiedDuring: 1500 })

// Icon per visibility value: gives the row an at-a-glance status, and the same
// icon marks the current choice as the menu trigger.
const VIS_ICON: Record<string, string> = {
  PRIVATE: mdiLockOutline,
  UNLISTED: mdiLinkVariant,
  CONTAINERS_ONLY: mdiFolderMultipleOutline,
  PUBLIC: mdiEarth,
}

const ROUTE_SEGMENT: Record<typeof props.kind, string> = {
  puzzle: 'puzzles',
  collection: 'collections',
  series: 'series',
}

const triggerIcon = computed(() => VIS_ICON[props.visibility] ?? mdiEyeOutline)
const menuOptions = computed(() =>
  props.visibilityOptions.map((o) => ({ ...o, icon: VIS_ICON[o.value] ?? mdiEyeOutline })),
)
const visibilityLabel = computed(() =>
  props.visibilityOptions.find((o) => o.value === props.visibility)?.label ?? 'Visibility',
)

// Private items have no shareable link. Everything else (unlisted, public,
// containers-only) is reachable via its share token.
const canShare = computed(() => props.visibility !== 'PRIVATE' && !!props.shareToken)
const shareUrl = computed(() =>
  `${window.location.origin}/${ROUTE_SEGMENT[props.kind]}/${props.entityId}?t=${props.shareToken}`,
)
</script>

<template>
  <ListMenu
    :options="menuOptions"
    :selected="props.visibility"
    :trigger-icon="triggerIcon"
    :title="`Visibility: ${visibilityLabel}`"
    @select="emit('updateVisibility', $event)"
  />

  <button
    v-if="canShare"
    type="button"
    class="p-1.5 rounded-lg shrink-0 hover:bg-paper"
    :class="copied ? 'text-green-600' : 'text-soft hover:text-action'"
    :title="copied ? 'Link copied' : 'Copy share link'"
    @click="copy(shareUrl)"
  >
    <MdiIcon
      :path="copied ? mdiCheck : mdiContentCopy"
      :size="16"
    />
  </button>
</template>
