<script setup lang="ts">
// Blurs the board while the timer is paused. Click anywhere to resume.
defineProps<{ resumeVerb?: string }>()
defineEmits<{ resume: [] }>()
</script>

<template>
  <div
    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-paper/40 backdrop-blur-[20px] cursor-pointer select-none"
    @click="$emit('resume')"
  >
    <span class="text-5xl">⏸</span>
    <span class="text-sm font-medium text-soft">Paused. {{ resumeVerb || 'Click' }} to resume</span>
  </div>
</template>
