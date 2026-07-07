<script setup lang="ts">
// Small "?" affordance with a hover/focus tooltip. Tooltip content is the slot.
defineProps<{ label: string }>()
</script>

<template>
  <span class="relative group inline-flex">
    <button
      type="button"
      class="w-[15px] h-[15px] shrink-0 rounded-full border border-line text-faint text-[10px] leading-none flex items-center justify-center hover:border-action hover:text-action transition-colors"
      :aria-label="`About ${label}`"
    >
      ?
    </button>
    <span
      class="hidden group-hover:block group-focus-within:block absolute right-0 top-full mt-1.5 w-56 max-w-[calc(100vw-3rem)] bg-surface border border-line rounded-lg shadow-lg p-2.5 text-[11px] text-soft leading-snug z-20"
    >
      <slot />
    </span>
  </span>
</template>
