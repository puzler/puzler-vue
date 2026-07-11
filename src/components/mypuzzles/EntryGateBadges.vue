<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiKeyOutline, mdiEyeOffOutline, mdiTrophyOutline, mdiClockOutline } from '@mdi/js'
import type { CollectionDetailQuery } from '@/graphql/generated/types'

type Entry = NonNullable<CollectionDetailQuery['collection']>['entries'][number]

// The hunt-gate badge cluster on an author entry row: schedule clock plus
// codeword/hidden/finale markers.
const props = defineProps<{ entry: Entry }>()

const GATE_BADGES = [
  { key: 'gated', icon: mdiKeyOutline, title: 'Codeword gate' },
  { key: 'hidden', icon: mdiEyeOffOutline, title: 'Hidden until codeword' },
  { key: 'finale', icon: mdiTrophyOutline, title: 'Finale' },
] as const

const scheduled = !!props.entry.releasedAt && new Date(props.entry.releasedAt) > new Date()
</script>

<template>
  <MdiIcon
    v-if="scheduled"
    :path="mdiClockOutline"
    :size="14"
    :title="`Releases ${new Date(entry.releasedAt!).toLocaleString()}`"
    class="text-action"
  />
  <span
    v-for="badge in GATE_BADGES"
    :key="badge.key"
  >
    <MdiIcon
      v-if="entry[badge.key]"
      :path="badge.icon"
      :size="14"
      :title="badge.title"
      class="text-action"
    />
  </span>
</template>
