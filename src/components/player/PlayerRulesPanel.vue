<script setup lang="ts">
defineProps<{ rules: string }>()
</script>

<template>
  <section class="flex-1 min-h-0 flex flex-col gap-1.5">
    <p class="px-1 text-[10px] font-semibold uppercase tracking-widest text-soft">
      Rules
    </p>
    <div class="flex-1 min-h-0 overflow-y-auto rounded-xl border border-line bg-surface p-3.5">
      <p
        v-if="rules"
        class="text-sm text-ink-text whitespace-pre-line leading-relaxed"
      >
        {{ rules }}
      </p>
      <p
        v-else
        class="text-sm italic text-faint"
      >
        Normal sudoku rules apply.
      </p>
    </div>
  </section>
</template>
