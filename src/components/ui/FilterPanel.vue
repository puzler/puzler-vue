<script setup lang="ts">
import FilterSheet from './FilterSheet.vue'

// Dual presentation for a list page's filter/folder controls: a fixed sidebar on
// desktop, a slide-up sheet on mobile. The caller passes the controls once in the
// default slot; this renders them in both places (only one is visible at a time —
// the aside is display:none below md, so there is no first-paint flash). `open`
// (driven by a mobile-only trigger in the toolbar) reveals the sheet.
withDefaults(defineProps<{
  open?: boolean
  title?: string
  asideClass?: string
  // data-tour anchor for the desktop sidebar (tours are disabled on mobile).
  tour?: string
}>(), {
  open: false,
  title: 'Filters',
  asideClass: 'w-56',
  tour: undefined,
})

defineEmits<{ close: [] }>()
</script>

<template>
  <aside
    :class="['hidden md:block shrink-0', asideClass]"
    :data-tour="tour"
  >
    <slot />
  </aside>

  <FilterSheet
    v-if="open"
    :title="title"
    @close="$emit('close')"
  >
    <slot />
  </FilterSheet>
</template>
