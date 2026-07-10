<script setup lang="ts">
import { computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiTrophyOutline, mdiClockOutline } from '@mdi/js'
import { huntProgress, type FlowEntry } from '@/utils/collectionEntries'

// The viewer's journey through the hunt: a progress line while solving, a
// completion card once every puzzle is done, and a teaser for the next
// scheduled chapter.
const props = defineProps<{
  entries: FlowEntry[]
  solved: Set<string>
  timed: boolean
  nextReleaseAt: string | null
}>()

const progress = computed(() => huntProgress(props.entries, props.solved))
const percent = computed(() =>
  (progress.value.total ? Math.round((progress.value.solved / progress.value.total) * 100) : 0))
const nextRelease = computed(() =>
  (props.nextReleaseAt ? new Date(props.nextReleaseAt).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : null))
</script>

<template>
  <div class="flex flex-col gap-3 mt-4">
    <div
      v-if="progress.complete"
      class="rounded-xl border border-action bg-action-tint p-4 flex items-start gap-3"
    >
      <MdiIcon
        :path="mdiTrophyOutline"
        :size="20"
        class="text-action shrink-0 mt-0.5"
      />
      <div>
        <p class="font-display font-bold text-action">
          Hunt complete!
        </p>
        <p class="text-sm text-ink-text mt-0.5">
          You solved all {{ progress.total }} puzzle{{ progress.total === 1 ? '' : 's' }}.
          <template v-if="timed">
            See where you placed on the leaderboard below.
          </template>
        </p>
      </div>
    </div>

    <div
      v-else-if="progress.total >= 2 && progress.solved > 0"
      class="flex items-center gap-3"
    >
      <div class="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
        <div
          class="h-full rounded-full bg-action transition-all duration-300"
          :style="{ width: `${percent}%` }"
        />
      </div>
      <span class="text-xs text-soft shrink-0">{{ progress.solved }} of {{ progress.total }} solved</span>
    </div>

    <p
      v-if="nextRelease"
      class="flex items-center gap-2 text-xs text-soft"
    >
      <MdiIcon
        :path="mdiClockOutline"
        :size="14"
        class="text-action shrink-0"
      />
      The next chapter arrives {{ nextRelease }}.
    </p>
  </div>
</template>
