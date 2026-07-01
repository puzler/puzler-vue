<script setup lang="ts">
import { mdiTune } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'

// Mobile-only (md:hidden) trigger that opens a list page's filter/folder sheet.
// Lives in the ListToolbar slot; the desktop sidebar replaces it from md: up.
withDefaults(defineProps<{ label?: string; icon?: string; count?: number }>(), {
  label: 'Filters',
  icon: mdiTune,
  count: 0,
})

defineEmits<{ open: [] }>()
</script>

<template>
  <button
    type="button"
    class="md:hidden inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line text-sm text-soft hover:text-ink-text shrink-0"
    @click="$emit('open')"
  >
    <MdiIcon
      :path="icon"
      :size="16"
    />
    {{ label }}
    <span
      v-if="count"
      class="min-w-4 px-1 rounded-full bg-action text-on-action text-[10px] leading-4 text-center"
    >{{ count }}</span>
  </button>
</template>
