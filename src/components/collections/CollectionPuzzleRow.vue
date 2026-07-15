<script setup lang="ts">
import { RouterLink } from 'vue-router'
import MdiIcon from '@/components/MdiIcon.vue'
import PatronBadge from '@/components/patreon/PatronBadge.vue'
import { mdiLockOutline, mdiCheckCircle } from '@mdi/js'

// One puzzle row in a collection's entry flow: a playable link when unlocked,
// a dashed locked row otherwise. `lockIcon` names the reason (sequence lock,
// codeword gate, finale). Patron-locked rows stay links — they land on the
// puzzle's lock panel with its become-a-patron path.
withDefaults(defineProps<{
  puzzle: { id: string; title: string; avgRating?: number | null }
  link: { name: string; params: Record<string, string>; query: Record<string, string> }
  unlocked: boolean
  showNumber: boolean
  number: number
  isSolved: boolean
  lockIcon?: string
  points?: number | null
  patronLocked?: boolean
}>(), { lockIcon: mdiLockOutline, points: null, patronLocked: false })
</script>

<template>
  <RouterLink
    v-if="patronLocked"
    :to="link"
    class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-line text-faint opacity-75 hover:opacity-100 transition-opacity"
  >
    <span
      v-if="showNumber"
      class="text-sm w-5 text-right shrink-0"
    >{{ number }}</span>
    <span class="truncate flex-1">{{ puzzle.title }}</span>
    <PatronBadge locked />
  </RouterLink>
  <RouterLink
    v-else-if="unlocked"
    :to="link"
    class="flex items-center gap-3 p-4 rounded-xl border border-line bg-surface hover:border-action hover:bg-action-tint transition-colors"
  >
    <span
      v-if="showNumber"
      class="text-sm text-faint w-5 text-right shrink-0"
    >{{ number }}</span>
    <span class="font-medium text-ink-text truncate flex-1">{{ puzzle.title }}</span>
    <span
      v-if="points !== null"
      class="text-xs font-display font-bold text-action shrink-0"
    >{{ points }} pts</span>
    <MdiIcon
      v-if="isSolved"
      :path="mdiCheckCircle"
      :size="16"
      class="text-green-500 shrink-0"
    />
    <span
      v-else-if="puzzle.avgRating"
      class="text-xs text-faint shrink-0"
    >★ {{ puzzle.avgRating.toFixed(1) }}</span>
  </RouterLink>
  <div
    v-else
    class="flex items-center gap-3 p-4 rounded-xl border border-dashed border-line text-faint cursor-not-allowed"
  >
    <span class="text-sm w-5 text-right shrink-0">{{ number }}</span>
    <span class="truncate flex-1">{{ puzzle.title }}</span>
    <MdiIcon
      :path="lockIcon"
      :size="16"
      class="shrink-0"
    />
  </div>
</template>
