<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'

const props = defineProps<{
  page: number
  totalPages: number
  totalCount: number
}>()
const emit = defineEmits<{ change: [page: number] }>()

const BTN = 'flex items-center gap-1 px-2 py-1 text-sm rounded-lg border border-line'
</script>

<template>
  <div
    v-if="props.totalPages > 1"
    class="flex items-center justify-center gap-3 mt-4"
  >
    <button
      :class="[BTN, props.page <= 1 ? 'text-faint cursor-not-allowed' : 'text-soft hover:text-action hover:border-action']"
      :disabled="props.page <= 1"
      @click="emit('change', props.page - 1)"
    >
      <MdiIcon
        :path="mdiChevronLeft"
        :size="16"
      />
      Prev
    </button>
    <span class="text-sm text-soft">
      Page {{ props.page }} of {{ props.totalPages }}
    </span>
    <button
      :class="[BTN, props.page >= props.totalPages ? 'text-faint cursor-not-allowed' : 'text-soft hover:text-action hover:border-action']"
      :disabled="props.page >= props.totalPages"
      @click="emit('change', props.page + 1)"
    >
      Next
      <MdiIcon
        :path="mdiChevronRight"
        :size="16"
      />
    </button>
  </div>
</template>
