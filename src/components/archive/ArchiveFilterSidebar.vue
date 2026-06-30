<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apolloClient } from '@/utils/apolloClient'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiRhombus, mdiRhombusOutline } from '@mdi/js'
import FacetSelect from './FacetSelect.vue'
import TagFilter from '@/components/listing/TagFilter.vue'
import { TIME_RANGES, SETTER_TIERS, MY_STATUS_OPTIONS, MIN_RATING_OPTIONS, DIFFICULTY_LEVELS } from '@/constants/archive'
import TagsDocument from '@/graphql/gql/tags/queries/Tags.graphql'
import PuzzleGridSizesDocument from '@/graphql/gql/puzzles/queries/PuzzleGridSizes.graphql'
import type {
  TagsQuery, TagsQueryVariables, PuzzleGridSizesQuery, PuzzleGridSizesQueryVariables,
  TimeRangeEnum, SetterTierEnum, MyStatusEnum,
} from '@/graphql/generated/types'

const props = defineProps<{ showMyStatus: boolean }>()

const timeRange = defineModel<TimeRangeEnum | null>('timeRange', { required: true })
const setterTier = defineModel<SetterTierEnum | null>('setterTier', { required: true })
const difficulties = defineModel<number[]>('difficulties', { required: true })
const minRating = defineModel<number | null>('minRating', { required: true })
const myStatus = defineModel<MyStatusEnum | null>('myStatus', { required: true })
const featured = defineModel<boolean>('featured', { required: true })
const tags = defineModel<string[]>('tags', { required: true })
const gridSizes = defineModel<string[]>('gridSizes', { required: true })

const tagOptions = ref<{ value: string; label: string }[]>([])
const sizeOptions = ref<{ value: string; label: string }[]>([])

onMounted(async () => {
  const [tagRes, sizeRes] = await Promise.all([
    apolloClient.query<TagsQuery, TagsQueryVariables>({ query: TagsDocument }),
    apolloClient.query<PuzzleGridSizesQuery, PuzzleGridSizesQueryVariables>({ query: PuzzleGridSizesDocument }),
  ])
  tagOptions.value = (tagRes.data?.tags ?? []).map((t) => ({ value: t.slug, label: t.name }))
  sizeOptions.value = (sizeRes.data?.puzzleGridSizes ?? []).map((s) => ({
    value: `${s.rows}x${s.cols}`, label: `${s.rows}×${s.cols} (${s.count})`,
  }))
})

function toggleDifficulty(level: number) {
  const set = new Set(difficulties.value)
  if (set.has(level)) set.delete(level)
  else set.add(level)
  difficulties.value = [...set]
}

function toggleGridSize(value: string) {
  const set = new Set(gridSizes.value)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  gridSizes.value = [...set]
}
</script>

<!--
  The facet controls for the puzzle archive. Rendered chrome-less (no width /
  sidebar wrapper) so FilterPanel can place it in either the desktop sidebar or
  the mobile filter sheet.
-->
<template>
  <div class="flex flex-col gap-4">
    <FacetSelect
      v-model="timeRange"
      label="Published"
      :options="TIME_RANGES"
      any-label="All time"
    />
    <FacetSelect
      v-model="setterTier"
      label="Setter"
      :options="SETTER_TIERS"
      any-label="Any setter"
    />

    <div class="flex flex-col gap-1">
      <p class="px-3 text-[10px] font-semibold uppercase tracking-widest text-faint">
        Difficulty
      </p>
      <div class="flex items-center gap-1 px-3">
        <button
          v-for="level in DIFFICULTY_LEVELS"
          :key="level"
          type="button"
          :class="difficulties.includes(level) ? 'text-action' : 'text-faint hover:text-soft'"
          :title="`Difficulty ${level}`"
          @click="toggleDifficulty(level)"
        >
          <MdiIcon
            :path="difficulties.includes(level) ? mdiRhombus : mdiRhombusOutline"
            :size="18"
          />
        </button>
      </div>
    </div>

    <FacetSelect
      v-model="minRating"
      label="Rating"
      :options="MIN_RATING_OPTIONS"
      any-label="Any rating"
    />

    <div
      v-if="sizeOptions.length"
      class="flex flex-col gap-1"
    >
      <p class="px-3 text-[10px] font-semibold uppercase tracking-widest text-faint">
        Grid size
      </p>
      <div class="flex flex-wrap gap-1 px-3">
        <button
          v-for="size in sizeOptions"
          :key="size.value"
          type="button"
          class="px-2 py-0.5 text-xs rounded-full border"
          :class="gridSizes.includes(size.value) ? 'border-action text-action bg-action-tint' : 'border-line text-soft hover:border-action'"
          @click="toggleGridSize(size.value)"
        >
          {{ size.label }}
        </button>
      </div>
    </div>

    <div class="px-3">
      <TagFilter
        v-model="tags"
        :options="tagOptions"
      />
    </div>

    <label class="flex items-center gap-2 px-3 text-sm text-soft cursor-pointer">
      <input
        v-model="featured"
        type="checkbox"
      >
      Featured only
    </label>

    <FacetSelect
      v-if="props.showMyStatus"
      v-model="myStatus"
      label="My status"
      :options="MY_STATUS_OPTIONS"
      any-label="Any"
    />
  </div>
</template>
